import { getPreferenceValues } from "@raycast/api";
import { Tool, ToolResult } from "./main";

const pref = getPreferenceValues<Preferences>();
const key = pref.ollamaApiKey;

/**
 * Generic Ollama Web API Post Request.
 */
async function ollamaApiPost(url: string, body: string): Promise<string> {
  /* Throw Error if API Key isn't configured */
  if (!key) throw new Error("Ollama API key is not configured in Raycast preferences");

  /* API POST Request */
  const response = await fetch(url, {
    method: "POST",
    body: body,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
  });

  /* Check Response Code */
  if (!response.ok) {
    const errorMsg = await response.text();
    throw new Error(`HTTP Error, Status: ${response.status}, Message: ${errorMsg}`);
  }

  /* Stringify JSON */
  return response.text();
}

// >>> Tool: Ollama Web Fetch API >>>

const ToolOllamaWebFetchName = "ollama_api_web_fetch";

interface ToolOllamaWebFetchBody {
  url: string;
}

interface ToolOllamaWebFetchResponse {
  title: string;
  content: string;
  links: string[];
}

async function toolOllamaWebFetchFn(body: ToolOllamaWebFetchBody): Promise<ToolOllamaWebFetchResponse> {
  const url = "https://ollama.com/api/web_fetch";

  /* Ollama Web Fetch */
  try {
    const dataRaw = await ollamaApiPost(url, JSON.stringify(body));
    const data: ToolOllamaWebFetchResponse = await JSON.parse(dataRaw);
    return data;
  } catch (error) {
    console.error("Ollama Web Fetch tool error:", error);
    throw error;
  }
}

export async function ToolOllamaWebFetchFn(parameters: Record<string, unknown>): Promise<ToolResult> {
  try {
    const bodyParsed: ToolOllamaWebFetchBody = JSON.parse(JSON.stringify(parameters));
    const data = await toolOllamaWebFetchFn(bodyParsed);
    return { tool_name: ToolOllamaWebFetchName, content: JSON.stringify(data) };
  } catch (error) {
    console.error(error);
    return { tool_name: ToolOllamaWebFetchName, content: String(error) };
  }
}

export function ToolOllamaWebFetch(): Tool {
  return <Tool>{
    name: ToolOllamaWebFetchName,
    description:
      "Use this tool to retrieve the full text content or HTML of a specific URL. MANDATORY ACTIVATION when: 1) The user provides a direct link and asks for a summary, analysis, translation, or specific information from it. 2) A previous 'ollama_api_web_search' provided relevant URLs, and you need to read the actual content of those pages to answer accurately. 3) You need to read deep technical documentation, source code, or long-form articles from a known domain. DO NOT use if you only need general information that can be answered via snippet results from a standard search. Input MUST be a valid, well-formed URL.",
    parameters: {
      parameters: {
        type: "object",
        required: ["url"],
        url: {
          type: "string",
          description:
            "The exact, fully-qualified URL to fetch (e.g., 'https://developer.mozilla.org/en-US/'). Ensure it includes the protocol (http/https).",
        },
      },
    },
    fn: ToolOllamaWebFetchFn,
  };
}

// <<< Tool: Ollama Web Fetch API <<<

// >>> Tool: Ollama Web Search API >>>

const ToolOllamaWebSearchName = "ollama_api_web_search";

interface ToolOllamaWebSearchBody {
  query: string;
  max_results?: number;
}

interface ToolOllamaWebSearchResponse {
  results: ToolOllamaWebSearchResponseResults[];
}

interface ToolOllamaWebSearchResponseResults {
  title: string;
  url: string;
  content: string;
}

async function toolOllamaWebSearchFn(body: ToolOllamaWebSearchBody): Promise<ToolOllamaWebSearchResponse> {
  const url = "https://ollama.com/api/web_search";

  /* Ollama Web Fetch */
  try {
    const dataRaw = await ollamaApiPost(url, JSON.stringify(body));
    const data: ToolOllamaWebSearchResponse = await JSON.parse(dataRaw);
    return data;
  } catch (error) {
    console.error("Ollama Web Fetch tool error:", error);
    throw error;
  }
}

export async function ToolOllamaWebSearchFn(parameters: Record<string, unknown>): Promise<ToolResult> {
  try {
    const bodyParsed: ToolOllamaWebSearchBody = JSON.parse(JSON.stringify(parameters));
    const data = await toolOllamaWebSearchFn(bodyParsed);
    return { tool_name: ToolOllamaWebSearchName, content: JSON.stringify(data) };
  } catch (error) {
    console.error(error);
    return { tool_name: ToolOllamaWebSearchName, content: String(error) };
  }
}

export function ToolOllamaWebSearch(): Tool {
  return <Tool>{
    name: ToolOllamaWebSearchName,
    description:
      "Use this tool to fetch real-time information from the web. MANDATORY ACTIVATION for: 1) Recent events, breaking news, or current affairs. 2) Up-to-date factual data, statistics, weather, financial markets, or sports results. 3) Technical documentation, API references, or code libraries updated recently. 4) Fact-checking or verifying claims where absolute certainty is lacking. DO NOT use for purely logical, mathematical, creative writing, or general conversational tasks. Formulate concise, keyword-based search queries optimized for search engines.",
    parameters: {
      parameters: {
        type: "object",
        required: ["query"],
        query: {
          type: "string",
          desciption:
            "The optimized search string. Avoid conversational phrases, punctuation, or long natural language questions unless strictly necessary.",
        },
        max_results: {
          type: "number",
          description: "Maximum results to return (default 5, max 10)",
        },
      },
    },
    fn: ToolOllamaWebSearchFn,
  };
}

// <<< Tool: Ollama Web Search API <<<

export function ToolsOllama(): Tool[] {
  return [ToolOllamaWebFetch(), ToolOllamaWebSearch()];
}
