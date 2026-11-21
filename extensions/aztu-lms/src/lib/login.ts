import { environment, getPreferenceValues, LocalStorage } from "@raycast/api";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  commonHeaders,
  LAST_LMS_LOGIN_LINK_KEY,
  LAST_LMS_LOGIN_TIMESTAMP_KEY,
  ONE_HOUR_IN_MS,
  SSO_BASE_URL,
} from "./constants";
import { fetchWithCookies } from "./utils";

type SSOUrl = { status: "old" } | { status: "new"; loginLink: string } | undefined;
export async function getSSOUrl({ retryCount = 0 }: { retryCount?: number }): Promise<SSOUrl> {
  const [lastLoginTimestamp, lastLoginLink] = await Promise.all([
    LocalStorage.getItem<string>(LAST_LMS_LOGIN_TIMESTAMP_KEY),
    LocalStorage.getItem<string>(LAST_LMS_LOGIN_LINK_KEY),
  ]);

  const lastLogin = parseInt(lastLoginTimestamp || "0");

  if (lastLoginLink && Date.now() - lastLogin < ONE_HOUR_IN_MS) {
    return { status: "old" };
  }

  const { userid, password } = getPreferenceValues<ExtensionPreferences>();

  let loginLink: string;
  try {
    const login = await ssoRequest<SSOLoginResult>("login", { username: userid, password });
    const user = login.systemChoiceRequired
      ? (await ssoRequest<SSOLoginResult>("select-system", { system: "SAP" })).user
      : login.user;

    const launch = await ssoRequest<SSOLaunchResult>("platform-launch", { target: user?.selectedSystem || "SAP" });
    loginLink = launch.redirectUrl || (await createAssertionPage(launch));
  } catch (error) {
    console.error("login.ts: getSSOUrl()", error);
    if (retryCount >= 3 || error instanceof SSOAuthError) return undefined;
    return await getSSOUrl({ retryCount: retryCount + 1 });
  }

  await Promise.all([
    LocalStorage.setItem(LAST_LMS_LOGIN_LINK_KEY, loginLink),
    LocalStorage.setItem(LAST_LMS_LOGIN_TIMESTAMP_KEY, Date.now().toString()),
  ]);

  return { status: "new", loginLink: loginLink };
}

type SSOLoginResult = { systemChoiceRequired?: boolean; user?: { selectedSystem?: string } };
type SSOLaunchResult = { redirectUrl?: string; action?: string; token?: string };

class SSOAuthError extends Error {}

async function ssoRequest<T>(endpoint: string, body: object): Promise<T> {
  const response = await fetchWithCookies(`${SSO_BASE_URL}/api/auth/${endpoint}`, {
    method: "POST",
    headers: { ...commonHeaders, Accept: "*/*", Origin: SSO_BASE_URL, Referer: `${SSO_BASE_URL}/` },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };

  if (!response.ok) {
    const message = `${endpoint} failed (${response.status}): ${data.error ?? "unknown error"}`;
    // Wrong credentials won't fix themselves, so don't retry them.
    throw response.status === 401 ? new SSOAuthError(message) : new Error(message);
  }
  return data;
}

// The SSO may hand back a one-time assertion that must be POSTed by the browser itself.
async function createAssertionPage({ action, token }: SSOLaunchResult): Promise<string> {
  if (!action || !token) throw new Error("platform-launch returned neither redirectUrl nor action/token");

  const escape = (value: string) => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  const html = `<!doctype html><html><body onload="document.forms[0].submit()">
<form method="POST" action="${escape(action)}"><input type="hidden" name="assertion" value="${escape(token)}"></form>
</body></html>`;

  const filePath = join(environment.supportPath, "aztu-login.html");
  await mkdir(environment.supportPath, { recursive: true });
  await writeFile(filePath, html);
  return pathToFileURL(filePath).href;
}
