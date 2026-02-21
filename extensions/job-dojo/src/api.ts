import { getPreferenceValues } from "@raycast/api";

type Preferences = {
  apiKey: string;
  apiBaseUrl: string;
  modelId?: string;
};

function getConfig(): Preferences {
  const prefs = getPreferenceValues<Preferences>();
  return {
    apiKey: prefs.apiKey,
    apiBaseUrl: prefs.apiBaseUrl || "https://jobdojo.app",
    modelId: prefs.modelId,
  };
}

function getHeaders(): HeadersInit {
  const config = getConfig();
  return {
    Authorization: `Bearer ${config.apiKey}`,
    "Content-Type": "application/json",
  };
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

export type RaycastCommand = "message" | "connection" | "webSearch";

export async function fetchChats(): Promise<Chat[]> {
  const config = getConfig();
  const response = await fetch(`${config.apiBaseUrl}/api/raycast/chats`, {
    method: "GET",
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch chats");
  }

  const data = await response.json();
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

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch chat");
  }

  const data = await response.json();
  return data.chat;
}

export async function fetchModels(): Promise<Model[]> {
  const config = getConfig();
  const response = await fetch(`${config.apiBaseUrl}/api/raycast/models`, {
    method: "GET",
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch models");
  }

  const data = await response.json();
  return data.models;
}

export async function fetchUserInfo(): Promise<UserInfo> {
  const config = getConfig();
  const response = await fetch(`${config.apiBaseUrl}/api/raycast/me`, {
    method: "GET",
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch user info");
  }

  return response.json();
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
      modelId: options?.modelId || config.modelId,
      command: options?.command,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to send message");
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

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch application stages");
  }

  const data = await response.json();
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

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create application");
  }

  const data = await response.json();
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

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to extract job details");
  }

  const data = await response.json();
  return data.data;
}
