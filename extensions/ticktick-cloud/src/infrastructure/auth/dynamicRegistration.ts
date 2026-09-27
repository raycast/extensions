import { ProtocolError } from "../../domain/errors";
import { REGISTRATION_ENDPOINT } from "./oauthMetadata";

export const DYNAMIC_REGISTRATION_REQUEST = {
  client_name: "Raycast TickTick",
  redirect_uris: ["https://raycast.com/redirect?packageName=Extension"],
  grant_types: ["authorization_code"],
  response_types: ["code"],
  token_endpoint_auth_method: "none",
} as const;

export { REGISTRATION_ENDPOINT };

function protocolFailure(): ProtocolError {
  return new ProtocolError("TickTick returned an invalid dynamic registration response.");
}

export function isVerifiedRegistrationEndpoint(value: string): boolean {
  return value === REGISTRATION_ENDPOINT;
}

export async function registerPublicClient(
  registrationEndpoint: string,
  fetchImpl: typeof fetch = fetch
): Promise<string> {
  if (!isVerifiedRegistrationEndpoint(registrationEndpoint)) throw protocolFailure();
  let response: Response;
  try {
    response = await fetchImpl(registrationEndpoint, {
      method: "POST",
      redirect: "error",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(DYNAMIC_REGISTRATION_REQUEST),
    });
  } catch {
    throw protocolFailure();
  }
  if (!response.ok || response.redirected) throw protocolFailure();
  try {
    const body: unknown = await response.json();
    if (typeof body !== "object" || body === null || Array.isArray(body)) throw protocolFailure();
    const clientId = (body as Record<string, unknown>).client_id;
    if (typeof clientId !== "string" || clientId.trim().length === 0) throw protocolFailure();
    return clientId.trim();
  } catch (error) {
    if (error instanceof ProtocolError) throw error;
    throw protocolFailure();
  }
}
