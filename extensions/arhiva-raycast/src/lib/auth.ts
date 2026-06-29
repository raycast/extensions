import { ConvexHttpClient } from "convex/browser";

import { notifyAuthRequired } from "./auth-state";
import { getRaycastClientInstanceId } from "./client-instance-id";
import { AuthRequiredError, RequestError } from "./errors";
import { raycastAuthClient } from "./oauth";
import { getAuthUrl, getConvexUrl, getTrustedAuthOrigin, getWebAppUrl } from "./preferences";
import {
  clearStoredSession,
  getStoredSession,
  setStoredSession,
  type StoredSession,
} from "./storage";

type ConvexTokenResponse = Readonly<{
  token: string;
}>;

type RaycastTokenResponse = Readonly<{
  token: string;
  user: Readonly<{
    email: string;
  }>;
}>;

type ApiErrorBody = Readonly<{
  code?: string;
  message?: string;
  error?: string;
  error_description?: string;
}>;

const RAYCAST_AUTH_CLIENT_ID = "raycast";
let activeWebAppSignIn: Promise<StoredSession> | null = null;

function getApiErrorMessage(value: unknown, fallback: string) {
  if (typeof value === "string") {
    const text = value.trim();
    return text.length > 0 ? text : fallback;
  }

  if (typeof value !== "object" || value === null) {
    return fallback;
  }

  const body = value as ApiErrorBody;
  return body.message ?? body.error_description ?? body.error ?? body.code ?? fallback;
}

function getFetchErrorMessage(error: unknown) {
  return error instanceof Error && error.message.length > 0 ? error.message : "fetch failed";
}

async function readResponseBody(response: Response) {
  const text = await response.text();
  if (text.length === 0) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    if (!response.ok) {
      return text;
    }
    throw error;
  }
}

async function fetchJson<ResponseBody>(
  input: string,
  init: RequestInit,
  fallbackErrorMessage: string,
) {
  let response: Response;
  try {
    response = await fetch(input, {
      ...init,
      headers: {
        Accept: "application/json",
        ...init.headers,
      },
    });
  } catch (error) {
    throw new RequestError(
      `Network request failed for ${input}: ${getFetchErrorMessage(error)}`,
      0,
    );
  }
  const body = await readResponseBody(response);

  if (!response.ok) {
    throw new RequestError(
      getApiErrorMessage(body, response.statusText || fallbackErrorMessage),
      response.status,
    );
  }

  return body as ResponseBody;
}

export async function signInWithWebApp() {
  activeWebAppSignIn ??= runWebAppSignIn().finally(() => {
    activeWebAppSignIn = null;
  });

  return await activeWebAppSignIn;
}

async function runWebAppSignIn() {
  const clientInstanceId = await getRaycastClientInstanceId();
  const authRequest = await raycastAuthClient.authorizationRequest({
    endpoint: getWebAppUrl("/sign-in"),
    clientId: RAYCAST_AUTH_CLIENT_ID,
    scope: "session",
    extraParameters: {
      client_instance_id: clientInstanceId,
      handoff_client_id: RAYCAST_AUTH_CLIENT_ID,
    },
  });
  const authorization = await raycastAuthClient.authorize(authRequest);
  const data = await fetchJson<RaycastTokenResponse>(
    getAuthUrl("/raycast/token"),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: RAYCAST_AUTH_CLIENT_ID,
        token: authorization.authorizationCode,
        state: authRequest.state,
        code_verifier: authRequest.codeVerifier,
        client_instance_id: clientInstanceId,
        redirect_uri: authRequest.redirectURI,
      }),
    },
    "Unable to finish Raycast sign-in.",
  );

  const session: StoredSession = {
    token: data.token,
    user: {
      email: data.user.email,
    },
  };
  await setStoredSession(session);
  return session;
}

async function getConvexAuthToken(sessionToken: string) {
  const response = await fetchJson<ConvexTokenResponse>(
    getAuthUrl("/api/auth/convex/token"),
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        Origin: getTrustedAuthOrigin(),
      },
    },
    "Unable to authenticate with Convex.",
  );

  return response.token;
}

export async function getAuthenticatedConvexClient() {
  const session = await getStoredSession();
  if (session === null) {
    notifyAuthRequired();
    throw new AuthRequiredError();
  }

  try {
    const token = await getConvexAuthToken(session.token);
    const client = new ConvexHttpClient(getConvexUrl(), {
      auth: token,
      logger: false,
    });
    return client;
  } catch (error) {
    if (error instanceof RequestError && (error.status === 401 || error.status === 403)) {
      await clearStoredSession();
      notifyAuthRequired();
      throw new AuthRequiredError();
    }
    throw error;
  }
}
