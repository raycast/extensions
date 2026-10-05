export const RAYCAST_CLIENT_ID = "happy-squid-raycast";
export const RAYCAST_REDIRECT_URI = "raycast://extensions/happy-squid/happy-squid/tasks";
export const RAYCAST_APP_URL = "happysquid-raycast://connect";
export const RAYCAST_AUTH_HASH = "#connect-raycast?";

export interface RaycastAuthorization {
  clientId: string;
  challenge: string;
  redirectUri: string;
  state: string;
}

export function parseRaycastAuthorization(params: URLSearchParams): RaycastAuthorization | null {
  const clientId = params.get("client_id");
  const challenge = params.get("code_challenge") ?? "";
  const redirectUri = params.get("redirect_uri") ?? "";
  const state = params.get("state") ?? "";
  if (
    clientId !== RAYCAST_CLIENT_ID ||
    params.get("response_type") !== "code" ||
    params.get("code_challenge_method") !== "S256" ||
    !/^[A-Za-z0-9_-]{43}$/.test(challenge) ||
    !state ||
    state.length > 512 ||
    redirectUri !== RAYCAST_REDIRECT_URI
  )
    return null;
  return { clientId, challenge, redirectUri, state };
}

export function raycastAuthorizationParams(request: RaycastAuthorization): URLSearchParams {
  return new URLSearchParams({
    client_id: request.clientId,
    response_type: "code",
    code_challenge_method: "S256",
    code_challenge: request.challenge,
    redirect_uri: request.redirectUri,
    state: request.state,
  });
}

export async function sha256Base64Url(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
