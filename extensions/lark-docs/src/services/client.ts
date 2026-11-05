import { Cookie, CookieJar } from "tough-cookie";
import { got } from "got";
import { setIsAuthenticated } from "../hooks/auth-state";
import { DOMAIN, GENERAL_DOMAIN } from "../utils/config";
import { clearAuthStorage, getStorage, setStorage, StorageKey } from "../utils/storage";

export class LarkAPIError extends Error {
  constructor(
    message: string,
    public readonly code?: number | string,
  ) {
    super(message);
    this.name = "LarkAPIError";
  }
}

export const cookieJar = new CookieJar();

export const baseClient = got.extend({
  cookieJar,
  headers: { "User-Agent": "Raycast/Lark Docs" },
  responseType: "json",
});

export async function hasStoredSession(): Promise<boolean> {
  return Boolean(await getStorage<string>(StorageKey.Session));
}

export async function restoreSession(): Promise<boolean> {
  if (!DOMAIN) return false;

  const session = await getStorage<string>(StorageKey.Session);
  if (!session) return false;

  await applySession(session);
  return true;
}

export async function applySession(session: string): Promise<void> {
  cookieJar.setCookieSync(
    new Cookie({
      key: "session",
      value: session,
      domain: DOMAIN,
      path: "/",
    }),
    GENERAL_DOMAIN,
  );
  setIsAuthenticated(true);
  await setStorage(StorageKey.Session, session);
}

export async function applyLoginCookies(cookieHeaders: string[]): Promise<void> {
  let session: string | undefined;

  for (const header of cookieHeaders) {
    const cookie = Cookie.parse(header);
    if (!cookie) continue;

    cookieJar.setCookieSync(header, GENERAL_DOMAIN);
    if (cookie.key === "session") session = cookie.value;
  }

  if (!session) throw new LarkAPIError("Lark did not return a session cookie.");
  await applySession(session);
}

export async function expireSession(message = "Session expired. Please scan the QR code again."): Promise<void> {
  setIsAuthenticated(false);
  cookieJar.removeAllCookiesSync();
  await clearAuthStorage();
  throw new LarkAPIError(message, 5);
}

export async function logout(): Promise<void> {
  setIsAuthenticated(false);
  cookieJar.removeAllCookiesSync();
  await clearAuthStorage();
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof LarkAPIError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "Unknown Lark API error";
}
