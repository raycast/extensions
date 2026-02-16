import { DustAPI } from "@dust-tt/client";
import { LocalStorage } from "@raycast/api";
import env from "../dust_api/env";
import { provider } from "../dust_api/oauth";
import { extractAndStoreRegion, setUser, setWorkspaceId } from "../utils";

type AskDustInput = {
  query: string;
  agent?: "dust" | "gpt-5" | "claude-4-sonnet";
};

type AskDustOutput = {
  answer: string;
  conversationId: string;
  conversationUrl: string;
  agent: string;
};

type Workspace = {
  sId: string;
  region: string;
};

type ConversationContext = {
  timezone: string;
  username: string;
  email: string | null;
  fullName: string;
  profilePictureUrl: string | null;
  origin: "raycast";
};

const AGENT_MAP: Record<NonNullable<AskDustInput["agent"]>, { id: string; name: string }> = {
  dust: { id: "dust", name: "Dust" },
  "gpt-5": { id: "gpt-5", name: "GPT-5" },
  "claude-4-sonnet": { id: "claude-4-sonnet", name: "Claude 4" },
};

function getDustApiUrl(region: string | null | undefined) {
  return region === "europe-west1" ? env.DUST_EU_URL : env.DUST_US_URL;
}

function removeCiteMention(message: string) {
  return message.replace(/ ?:cite\[[a-zA-Z0-9, ]+\]/g, "");
}

function resolveWorkspace(workspaces: Workspace[], preferredWorkspaceId: string | null): Workspace | undefined {
  if (preferredWorkspaceId) {
    const found = workspaces.find((workspace) => workspace.sId === preferredWorkspaceId);
    if (found) {
      return found;
    }
  }
  return workspaces[0];
}

function getConversationContext(user: {
  firstName: string;
  fullName: string;
  image: string | null;
  email: string;
}): ConversationContext {
  return {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    username: user.firstName,
    email: user.email,
    fullName: user.fullName,
    profilePictureUrl: user.image,
    origin: "raycast",
  };
}

async function createAuthorizedClient() {
  const token = await provider.authorize();
  let region: string | undefined = await LocalStorage.getItem<string>("selectedRegion");
  if (!region) {
    region = (await extractAndStoreRegion(token)) ?? undefined;
  }
  const apiUrl = getDustApiUrl(region);
  return new DustAPI({ url: apiUrl }, { apiKey: token, workspaceId: "" }, console);
}

async function ensureWorkspace(client: DustAPI) {
  const me = await client.me();
  if (me.isErr()) {
    throw new Error(`Could not load Dust profile: ${me.error.message}`);
  }

  await setUser(me.value);
  const preferredWorkspaceId =
    (await LocalStorage.getItem<string>("workspaceId")) ?? me.value.selectedWorkspace ?? null;
  const workspaces: Workspace[] =
    me.value.organizations
      ?.filter((org) => org.externalId)
      .map((org) => ({
        sId: org.externalId as string,
        region: org.metadata?.region || "us-central1",
      })) ?? [];

  const selectedWorkspace = resolveWorkspace(workspaces, preferredWorkspaceId);
  if (!selectedWorkspace) {
    throw new Error("No workspaces found in your Dust account. Open the extension and run Select Workspace first.");
  }

  await setWorkspaceId(selectedWorkspace.sId);
  await LocalStorage.setItem("selectedRegion", selectedWorkspace.region);

  if (client.apiUrl() !== getDustApiUrl(selectedWorkspace.region)) {
    const token = await provider.authorize();
    client = new DustAPI(
      { url: getDustApiUrl(selectedWorkspace.region) },
      { apiKey: token, workspaceId: selectedWorkspace.sId },
      console,
    );
  } else {
    client.setWorkspaceId(selectedWorkspace.sId);
  }

  return { client, user: me.value };
}

export default async function askDust(input: AskDustInput): Promise<AskDustOutput> {
  const question = input.query?.trim();
  if (!question) {
    throw new Error("Query is required.");
  }

  const agent = AGENT_MAP[input.agent ?? "dust"];
  let client = await createAuthorizedClient();
  const workspaceData = await ensureWorkspace(client);
  client = workspaceData.client;

  const context = getConversationContext(workspaceData.user);
  const conversationResult = await client.createConversation({
    title: null,
    visibility: "unlisted",
    message: {
      content: question,
      mentions: [{ configurationId: agent.id }],
      context,
    },
  });

  if (conversationResult.isErr()) {
    throw new Error(`Could not create conversation: ${conversationResult.error.message}`);
  }

  const { conversation, message } = conversationResult.value;
  if (!message) {
    throw new Error("Dust did not return a user message ID.");
  }

  const answerStreamResult = await client.streamAgentAnswerEvents({
    conversation,
    userMessageId: message.sId,
  });

  if (answerStreamResult.isErr()) {
    throw new Error(`Could not stream answer: ${answerStreamResult.error.message}`);
  }

  let answer = "";

  for await (const event of answerStreamResult.value.eventStream) {
    if (!event) {
      continue;
    }

    switch (event.type) {
      case "user_message_error":
        throw new Error(`User message error: ${event.error.message}`);
      case "agent_error":
        throw new Error(`Agent error: ${event.error.message}`);
      case "agent_action_success":
        break;
      case "generation_tokens":
        if (event.classification === "tokens") {
          answer = `${answer}${event.text}`;
        }
        break;
      case "agent_message_success":
        answer = event.message.content ?? answer;
        break;
      default:
        break;
    }
  }

  if (!answer.trim()) {
    throw new Error(`@${agent.name} returned an empty answer.`);
  }

  const cleanedAnswer = removeCiteMention(answer.trim());
  return {
    answer: cleanedAnswer,
    conversationId: conversation.sId,
    conversationUrl: `${client.apiUrl()}/w/${client.workspaceId()}/assistant/${conversation.sId}`,
    agent: agent.name,
  };
}
