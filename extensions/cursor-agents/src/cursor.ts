import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { URLSearchParams } from "url";

const { apiKey } = getPreferenceValues<ExtensionPreferences>();

type ModelsResponse = {
  models: [string];
};

export function useModels() {
  return useFetch<ModelsResponse>("https://api.cursor.com/v0/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

export type Agent = {
  id: string;
  status: "RUNNING" | "FINISHED" | "ERROR" | "CREATING" | "EXPIRED";
  source: {
    repository: string;
    ref: string;
  };
  target: {
    branchName?: string;
    url: string;
    prUrl?: string;
    autoCreatePr: boolean;
  };
  name: string;
  createdAt: string;
  summary?: string;
};

type AgentsResponse = {
  agents: Agent[];
  nextCursor?: string;
};

export function useAgents(config?: { limit?: number }) {
  return useFetch(
    (options) => {
      const params = new URLSearchParams({
        limit: config?.limit?.toString() ?? "20",
      });

      if (options.cursor) {
        params.set("cursor", options.cursor);
      }

      return "https://api.cursor.com/v0/agents?" + params.toString();
    },
    {
      headers: { Authorization: `Bearer ${apiKey}` },
      mapResult(result: AgentsResponse) {
        return {
          data: result.agents.map((agent) => ({
            ...agent,
            name: agent.name || "New Background Agent",
          })),
          hasMore: !!result.nextCursor,
          cursor: result.nextCursor,
        };
      },
      keepPreviousData: true,
    },
  );
}

type LaunchAgentResponse = {
  id: string;
  status: "CREATING" | string;
  source: {
    repository: string;
    ref: string;
  };
  target: {
    branchName: string;
    url: string;
    autoCreatePr: boolean;
  };
};

type LaunchAgentError = {
  error: string;
  details?: {
    message: string;
    code: string;
  }[];
};

type LaunchAgentRequest = {
  prompt: {
    text: string;
    images?: Array<{
      data: string;
      dimension: {
        width: number;
        height: number;
      };
    }>;
  };
  source: { repository: string; ref?: string };
  model?: string;
  target?: {
    branchName?: string;
    autoCreatePr?: boolean;
  };
};

export async function launchAgent(request: LaunchAgentRequest) {
  const response = await fetch("https://api.cursor.com/v0/agents", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const data = (await response.json()) as LaunchAgentError;
    const message = data.details?.map((detail) => detail.message).join("\n") || "";
    console.error("Error launching agent", data);
    throw new Error(data.error + (message ? ": " + message : ""));
  }

  const data = await response.json();
  return data as LaunchAgentResponse;
}

type DeleteAgentResponse = {
  id: string;
};

type DeleteAgentError = {
  error: string;
  details?: {
    message: string;
    code: string;
  }[];
};

export async function deleteAgent(agentId: string) {
  const response = await fetch(`https://api.cursor.com/v0/agents/${agentId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    const data = (await response.json()) as DeleteAgentError;
    const message = data.details?.map((detail) => detail.message).join("\n") || "";
    console.error("Error deleting agent", data);
    throw new Error(data.error + (message ? ": " + message : ""));
  }

  const data = await response.json();
  return data as DeleteAgentResponse;
}

type AddFollowupRequest = {
  prompt: {
    text: string;
    images?: Array<{
      data: string;
      dimension: {
        width: number;
        height: number;
      };
    }>;
  };
};

type AddFollowupResponse = {
  id: string;
};

type AddFollowupError = {
  error: string;
  details?: {
    message: string;
    code: string;
  }[];
};

export async function addFollowup(agentId: string, request: AddFollowupRequest) {
  const response = await fetch(`https://api.cursor.com/v0/agents/${agentId}/followup`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const data = (await response.json()) as AddFollowupError;
    const message = data.details?.map((detail) => detail.message).join("\n") || "";
    console.error("Error adding followup", data);
    throw new Error(data.error + (message ? ": " + message : ""));
  }

  const data = await response.json();
  return data as AddFollowupResponse;
}

type ConversationMessage = {
  id: string;
  type: "user_message" | "assistant_message";
  text: string;
};

type ConversationResponse = {
  id: string;
  messages: ConversationMessage[];
};

type ConversationError = {
  error: string;
  details?: {
    message: string;
    code: string;
  }[];
};

export async function getAgentConversation(agentId: string) {
  const response = await fetch(`https://api.cursor.com/v0/agents/${agentId}/conversation`, {
    method: "GET",
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    const data = (await response.json()) as ConversationError;
    const message = data.details?.map((detail) => detail.message).join("\n") || "";
    console.error("Error getting conversation", data);
    throw new Error(data.error + (message ? ": " + message : ""));
  }

  const data = await response.json();
  return data as ConversationResponse;
}
