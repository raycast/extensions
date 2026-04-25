import { getAuthToken, getServerUrl } from "../lib/auth";

/**
 * Check the health and configuration status of the LightRAG server.
 * Returns information about the server status, configured LLM model,
 * embedding model, and pipeline state.
 * Use this when the user asks about server status or system health.
 *
 * No tool arguments; Raycast passes `{}`.
 */
interface Input {}

export default async function getHealth(_input: Input): Promise<string> {
  void _input;
  const serverUrl = getServerUrl();

  let token: string;
  try {
    token = await getAuthToken();
  } catch (error) {
    return `Authentication error: ${error instanceof Error ? error.message : String(error)}`;
  }

  try {
    const response = await fetch(`${serverUrl}/health`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return `Server responded with HTTP ${response.status}`;
    }

    const data = (await response.json()) as {
      status?: string;
      webui_available?: boolean;
      working_directory?: string;
      input_directory?: string;
      configuration?: {
        llm_binding?: string;
        llm_model?: string;
        embedding_binding?: string;
        embedding_model?: string;
        workspace?: string;
      };
      auth_mode?: string;
      pipeline_busy?: boolean;
      core_version?: string;
      api_version?: string;
    };

    let result = `**LightRAG Server Status: ${data.status || "unknown"}**\n\n`;

    if (data.configuration) {
      const c = data.configuration;
      result += "**Configuration:**\n";
      result += `- LLM: ${c.llm_binding || "?"} / ${c.llm_model || "?"}\n`;
      result += `- Embedding: ${c.embedding_binding || "?"} / ${c.embedding_model || "?"}\n`;
      result += `- Workspace: ${c.workspace || "?"}\n`;
    }

    result += `\n**System:**\n`;
    result += `- Pipeline busy: ${data.pipeline_busy ? "Yes" : "No"}\n`;
    result += `- WebUI available: ${data.webui_available ? "Yes" : "No"}\n`;
    result += `- Auth mode: ${data.auth_mode || "?"}\n`;
    result += `- Core version: ${data.core_version || "?"}\n`;
    result += `- API version: ${data.api_version || "?"}\n`;

    return result;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("fetch")) {
      return `Cannot reach LightRAG at ${serverUrl}. Check the server URL and network connectivity.`;
    }
    return `Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}
