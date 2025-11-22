import { Sourcegraph, getAnonymousUserID } from "../";
import { getProxiedFetch } from "../gql/fetchProxy";

// Deep Search API Types
// To modify just tell Amp to look at https://sourcegraph.com/docs/deep-search/api
export type DeepSearchStatus = "pending" | "processing" | "completed" | "failed";

export interface DeepSearchStats {
  time_millis: number;
  tool_calls: number;
  total_input_tokens: number;
  cached_tokens: number;
  cache_creation_input_tokens: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  credits: number;
}

export interface DeepSearchSource {
  type: string;
  link: string;
  label: string;
}

export interface DeepSearchQuestion {
  id: number;
  conversation_id: number;
  question: string;
  created_at: string;
  updated_at: string;
  status: DeepSearchStatus;
  title?: string;
  answer?: string;
  sources?: DeepSearchSource[];
  stats?: DeepSearchStats;
  suggested_followups?: string[];
  turns?: DeepSearchTurn[];
  error?: {
    title: string;
    kind: "TokenLimitExceeded" | "Cancelled" | "RateLimitExceeded" | "InternalError";
    message: string;
    details?: string;
  };
}

export interface DeepSearchTurn {
  reasoning: string;
  role: "user" | string;
}

export interface DeepSearchConversation {
  id: number;
  questions: DeepSearchQuestion[];
  created_at: string;
  updated_at: string;
  user_id: number;
  read_token: string;
  share_url: string;
  title?: string;
  starred?: boolean;
}

export interface DeepSearchRequestBody {
  question: string;
}

async function buildDeepSearchHeaders(src: Sourcegraph): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Requested-With": "raycast-sourcegraph 0.0.0",
  };

  if (src.token) {
    headers["Authorization"] = `token ${src.token}`;
  }

  // Mirror streaming search & dotCom anonymous ID usage
  const anonymousUserID = await getAnonymousUserID();
  if (anonymousUserID) {
    headers["X-Sourcegraph-Actor-Anonymous-UID"] = anonymousUserID;
  }

  return headers;
}

// Helper to normalize Deep Search conversations
// Currently, if a question has an error, we force the status to be "failed"
function fixDeepSearchConversation(c: DeepSearchConversation): DeepSearchConversation {
  if (!c.questions) return c;
  for (const q of c.questions) {
    if (q.error) {
      q.status = "failed";
    }
  }
  return c;
}

export async function startDeepSearch(src: Sourcegraph, body: DeepSearchRequestBody): Promise<DeepSearchConversation> {
  const fetchFn = getProxiedFetch(src.proxy);
  const headers = await buildDeepSearchHeaders(src);

  const resp = await fetchFn(`${src.instance}/.api/deepsearch/v1`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Deep Search POST failed (${resp.status}): ${text || resp.statusText}`);
  }

  const conv = (await resp.json()) as DeepSearchConversation;
  return fixDeepSearchConversation(conv);
}

export async function fetchDeepSearchConversation(src: Sourcegraph, id: number): Promise<DeepSearchConversation> {
  const fetchFn = getProxiedFetch(src.proxy);
  const headers = await buildDeepSearchHeaders(src);

  const resp = await fetchFn(`${src.instance}/.api/deepsearch/v1/${id}`, {
    method: "GET",
    headers,
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Deep Search GET failed (${resp.status}): ${text || resp.statusText}`);
  }

  const conv = (await resp.json()) as DeepSearchConversation;
  return fixDeepSearchConversation(conv);
}

export async function deleteDeepSearchConversation(src: Sourcegraph, id: number): Promise<void> {
  const fetchFn = getProxiedFetch(src.proxy);
  const headers = await buildDeepSearchHeaders(src);

  const resp = await fetchFn(`${src.instance}/.api/deepsearch/v1/${id}`, {
    method: "DELETE",
    headers,
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Deep Search DELETE failed (${resp.status}): ${text || resp.statusText}`);
  }
}

export async function listDeepSearchConversations(src: Sourcegraph): Promise<DeepSearchConversation[]> {
  const fetchFn = getProxiedFetch(src.proxy);
  const headers = await buildDeepSearchHeaders(src);

  const url = `${src.instance}/.api/deepsearch/v1`;

  const resp = await fetchFn(url, { method: "GET", headers });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Deep Search list GET failed (${resp.status}): ${text || resp.statusText}`);
  }

  const data = await resp.json();
  if (Array.isArray(data)) {
    return data.map(fixDeepSearchConversation) as DeepSearchConversation[];
  }

  // Handle potential wrapper objects (e.g. { conversations: [...] })
  const listResponse = data as {
    conversations?: DeepSearchConversation[];
  };

  if (Array.isArray(listResponse.conversations)) {
    return listResponse.conversations.map(fixDeepSearchConversation);
  }

  // Fallback: if we can't find a list, throw an error to avoid UI crashes
  console.error("Unexpected Deep Search list response format:", data);
  throw new Error(
    "Deep Search list response format is not recognized (expected array or object with nodes/conversations)",
  );
}
