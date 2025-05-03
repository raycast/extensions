import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";

type Session = {
  capabilities: Record<string, unknown>;
  apiUrl: string;
  primaryAccounts: Record<string, string>;
};

function getHeaders() {
  const { api_token } = getPreferenceValues();
  return {
    Authorization: `Bearer ${api_token}`,
    "Content-Type": "application/json",
  };
}

let session: Session | undefined;
async function getSession(): Promise<Session> {
  if (session) {
    return session;
  }
  try {
    const headers = getHeaders();
    const response = await fetch("https://api.fastmail.com/jmap/session", { headers });
    session = (await response.json()) as Session;
    return session;
  } catch {
    throw new Error("Failed to authenticate, please check your API token");
  }
}

type APIRequest<Method> = {
  using: string[];
  methodCalls: [string, Method, string][];
};

type APIResponse<Method> = {
  methodResponses: [string, Method, string][];
};

interface MakeRequestArgs<Request> {
  request: APIRequest<Request>;
}
async function makeRequest<Request, Response>({ request }: MakeRequestArgs<Request>): Promise<APIResponse<Response>> {
  const session = await getSession();
  const headers = getHeaders();

  const response = await fetch(session.apiUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(request),
  });

  return (await response.json()) as APIResponse<Response>;
}

export { getSession, makeRequest, type APIRequest, type APIResponse, type Session };
