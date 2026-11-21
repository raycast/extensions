const messages: Record<string, string> = {
  PERMISSION_DENIED: "Your account could not access these records. Please sign in again or try later.",
  UNAUTHENTICATED: "Your session expired. Please reopen the command to sign in again.",
  RESOURCE_EXHAUSTED: "The cloud usage limit was reached. Please try again later.",
  FAILED_PRECONDITION: "Another device changed these records. Please try saving again.",
  ALREADY_EXISTS: "This activity may already be saved. Please refresh and try again.",
  ABORTED: "Another device changed these records. Please try saving again.",
  UNAVAILABLE: "The cloud is unavailable. Please try again later.",
  invalid_grant: "Your Google sign-in expired. Please sign in again.",
  invalid_client: "Google sign-in is temporarily unavailable. Please try again later.",
  OPERATION_NOT_ALLOWED: "Google sign-in is disabled in this Firebase project.",
  INVALID_IDP_RESPONSE: "Google sign-in could not be completed. Please try again later.",
  API_KEY_HTTP_REFERRER_BLOCKED: "Your Firebase API restrictions block native apps. Review the setup instructions.",
  FEDERATED_USER_ID_ALREADY_LINKED: "Please use the Google account already linked to Daily Karte.",
};

export class ServiceError extends Error {
  constructor(public readonly code: string) {
    super(messages[code] ?? "The request failed. Check your connection and Firebase setup, then try again.");
  }
}

export async function requestJSON<T>(url: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new Error("The service could not be reached. Check your connection and try again.");
  }
  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error("The service returned an invalid response. Please try again later.");
  }
  if (!response.ok) {
    const code = typeof body?.error === "string" ? body.error : (body?.error?.status ?? body?.error?.message);
    throw new ServiceError(Object.hasOwn(messages, code) ? code : "REQUEST_FAILED");
  }
  return body as T;
}
