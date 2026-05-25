import { getPreferenceValues } from "@raycast/api";

function getConfig(): Preferences {
  const prefs = getPreferenceValues<Preferences>();
  const apiKey = prefs.apiKey?.trim();
  if (!apiKey) {
    throw new Error("API key is not set. Add it in the extension preferences.");
  }
  return {
    apiKey,
    apiBaseUrl: prefs.apiBaseUrl || "https://www.jobdojo.app",
  };
}

function getHeaders() {
  const config = getConfig();
  return {
    Authorization: `Bearer ${config.apiKey}`,
    "Content-Type": "application/json",
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function getApiErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const data: unknown = await response.json();
    if (isRecord(data) && typeof data.error === "string" && data.error) {
      return data.error;
    }
  } catch {
    // Ignore parse errors and use fallback.
  }

  return fallback;
}

async function parseApiResponse<T>(
  response: Response,
  fallbackError: string,
): Promise<T> {
  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response, fallbackError));
  }

  return (await response.json()) as T;
}

export type Model = {
  id: string;
  name: string;
  displayName: string;
  isDefault: boolean;
  hasReasoning: boolean;
  isFast: boolean;
  hasImageGeneration: boolean;
  aiSdk: string;
};

export type UserInfo = {
  user: {
    id: string;
    name: string;
    email: string;
  };
  membership: {
    plan: "free" | "pro";
    status: string;
    messagesUsage: number;
  };
  resume: {
    hasResume: boolean;
    hasAboutMe: boolean;
    hasPassionateAbout: boolean;
  };
};

export type Chat = {
  id: string;
  name: string;
  isPinned: boolean;
  updatedAt: string;
  modelName?: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

export type ChatWithMessages = Chat & {
  messages: ChatMessage[];
};

type ChatsResponse = { chats: Chat[] };
type ChatResponse = { chat: ChatWithMessages };
type ModelsResponse = { models: Model[] };
type ApplicationStagesResponse = { stages: ApplicationStage[] };
type CreateApplicationResponse = { application: CreatedApplication };
type ExtractJobResponse = { data: ExtractedJobData };

export type RaycastCommand = "message" | "connection" | "webSearch";

export async function fetchChats(): Promise<Chat[]> {
  const config = getConfig();
  const response = await fetch(`${config.apiBaseUrl}/api/raycast/chats`, {
    method: "GET",
    headers: getHeaders(),
  });

  const data = await parseApiResponse<ChatsResponse>(
    response,
    "Failed to fetch chats",
  );
  return data.chats;
}

export async function fetchChat(chatId: string): Promise<ChatWithMessages> {
  const config = getConfig();
  const response = await fetch(
    `${config.apiBaseUrl}/api/raycast/chats/${chatId}`,
    {
      method: "GET",
      headers: getHeaders(),
    },
  );

  const data = await parseApiResponse<ChatResponse>(
    response,
    "Failed to fetch chat",
  );
  return data.chat;
}

export async function fetchModels(): Promise<Model[]> {
  const config = getConfig();
  const response = await fetch(`${config.apiBaseUrl}/api/raycast/models`, {
    method: "GET",
    headers: getHeaders(),
  });

  const data = await parseApiResponse<ModelsResponse>(
    response,
    "Failed to fetch models",
  );
  return data.models;
}

export async function fetchUserInfo(): Promise<UserInfo> {
  const config = getConfig();
  const response = await fetch(`${config.apiBaseUrl}/api/raycast/me`, {
    method: "GET",
    headers: getHeaders(),
  });

  return parseApiResponse<UserInfo>(response, "Failed to fetch user info");
}

export async function* streamChat(
  message: string,
  options?: { chatId?: string; modelId?: string; command?: RaycastCommand },
): AsyncGenerator<
  string,
  { chatId?: string; model: string; imageUrl?: string },
  undefined
> {
  const config = getConfig();
  const response = await fetch(`${config.apiBaseUrl}/api/raycast/chat`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      message,
      chatId: options?.chatId,
      modelId: options?.modelId,
      command: options?.command,
    }),
  });

  if (!response.ok) {
    throw new Error(
      await getApiErrorMessage(response, "Failed to send message"),
    );
  }

  const chatId = response.headers.get("X-Chat-Id") || undefined;
  const model = response.headers.get("X-Model") || "";
  const imageUrl = response.headers.get("X-Image-Url") || undefined;

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }

  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    yield decoder.decode(value, { stream: true });
  }

  return { chatId, model, imageUrl };
}

// Application types
export type ApplicationStage = {
  id: string;
  name: string;
  color: string | null;
  order: number;
};

export type ApplicationStatus = "Cold" | "Warm" | "Closed";

export type InterviewFormat = "InPerson" | "Phone" | "Remote";

export type CreateApplicationInput = {
  company: string;
  role: string;
  stageId: string;
  status?: ApplicationStatus;
  location?: string;
  jobUrl?: string;
  contactName?: string;
  contactEmail?: string;
  interviewFormat?: InterviewFormat;
  notes?: string;
  jobDescription?: string;
  appliedAt?: string;
};

export type CreatedApplication = {
  id: string;
  company: string;
  role: string;
  stage: {
    id: string;
    name: string;
    color: string | null;
  };
  status: ApplicationStatus;
  createdAt: string;
};

export async function fetchApplicationStages(): Promise<ApplicationStage[]> {
  const config = getConfig();
  const response = await fetch(
    `${config.apiBaseUrl}/api/raycast/applications/stages`,
    {
      method: "GET",
      headers: getHeaders(),
    },
  );

  const data = await parseApiResponse<ApplicationStagesResponse>(
    response,
    "Failed to fetch application stages",
  );
  return data.stages;
}

export async function createApplication(
  input: CreateApplicationInput,
): Promise<CreatedApplication> {
  const config = getConfig();
  const response = await fetch(
    `${config.apiBaseUrl}/api/raycast/applications`,
    {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(input),
    },
  );

  const data = await parseApiResponse<CreateApplicationResponse>(
    response,
    "Failed to create application",
  );
  return data.application;
}

export type ExtractedJobData = {
  company: string | null;
  role: string | null;
  location: string | null;
  jobUrl: string;
  contactName: string | null;
  contactEmail: string | null;
  jobDescription: string | null;
};

export async function extractJobFromUrl(
  url: string,
): Promise<ExtractedJobData> {
  const config = getConfig();
  const response = await fetch(
    `${config.apiBaseUrl}/api/raycast/applications/extract`,
    {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ url }),
    },
  );

  const data = await parseApiResponse<ExtractJobResponse>(
    response,
    "Failed to extract job details",
  );
  return data.data;
}
