import { backendJson } from "./backend";
import { CLIENT } from "./config";
import { setSession, type Session } from "./session";

// Passwordless email login (APP_STANDARDS S3): request a code, then exchange email+code for a token.
export async function requestLoginCode(email: string): Promise<void> {
  await backendJson<void>(`/api/${CLIENT}/v2/login-codes`, {
    method: "POST",
    body: JSON.stringify({ email: email.trim() }),
  });
}

export async function verifyLoginCode(email: string, code: string): Promise<Session> {
  const res = await backendJson<{ token: string; user_id: string }>(`/api/${CLIENT}/v2/sessions`, {
    method: "POST",
    body: JSON.stringify({ email: email.trim(), code: code.trim() }),
  });
  const session: Session = { token: res.token, userId: res.user_id, email: email.trim() };
  await setSession(session);
  return session;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
