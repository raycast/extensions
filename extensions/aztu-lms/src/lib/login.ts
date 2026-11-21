import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import {
  commonHeaders,
  LAST_LMS_LOGIN_LINK_KEY,
  LAST_LMS_LOGIN_TIMESTAMP_KEY,
  ONE_HOUR_IN_MS,
  SSO_BASE_URL,
} from "./constants";
import { fetchWithCookies } from "./utils";

const ASSERTION_PAGE_TIMEOUT_MS = 60 * 1000;

// `served` is set when loginLink is a one-shot localhost page; it resolves false if the browser never loaded it.
type SSOUrl = { status: "old" } | { status: "new"; loginLink: string; served?: Promise<boolean> } | undefined;

export async function clearLoginState() {
  await Promise.all([
    LocalStorage.setItem(LAST_LMS_LOGIN_LINK_KEY, ""),
    LocalStorage.setItem(LAST_LMS_LOGIN_TIMESTAMP_KEY, ""),
  ]);
}

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
  let served: Promise<boolean> | undefined;
  try {
    const login = await ssoRequest<SSOLoginResult>("login", { username: userid, password });
    const user = login.systemChoiceRequired
      ? (await ssoRequest<SSOLoginResult>("select-system", { system: "SAP" })).user
      : login.user;

    const launch = await ssoRequest<SSOLaunchResult>("platform-launch", { target: user?.selectedSystem || "SAP" });
    if (launch.redirectUrl) loginLink = launch.redirectUrl;
    else ({ url: loginLink, served } = await serveAssertionPage(launch));
  } catch (error) {
    console.error("login.ts: getSSOUrl()", error);
    if (retryCount >= 3 || error instanceof SSOAuthError) return undefined;
    return await getSSOUrl({ retryCount: retryCount + 1 });
  }

  await Promise.all([
    LocalStorage.setItem(LAST_LMS_LOGIN_LINK_KEY, loginLink),
    LocalStorage.setItem(LAST_LMS_LOGIN_TIMESTAMP_KEY, Date.now().toString()),
  ]);

  return { status: "new", loginLink, served };
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

// The SSO may hand back a one-time assertion that the browser itself must POST. It is served once from
// localhost (never written to disk), so it always opens in the browser and the token doesn't linger.
async function serveAssertionPage({
  action,
  token,
}: SSOLaunchResult): Promise<{ url: string; served: Promise<boolean> }> {
  if (!action || !token) throw new Error("platform-launch returned neither redirectUrl nor action/token");

  const escape = (value: string) => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  const html = `<!doctype html><html><body onload="document.forms[0].submit()">
<form method="POST" action="${escape(action)}"><input type="hidden" name="assertion" value="${escape(token)}"></form>
</body></html>`;
  const path = `/${randomUUID()}`;

  let finish: (wasServed: boolean) => void = () => {};
  const served = new Promise<boolean>((resolve) => (finish = resolve));
  const server = createServer((req, res) => {
    if (req.url !== path) return res.writeHead(404).end();
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }).end(html);
    close(true);
  });
  const timeout = setTimeout(() => close(false), ASSERTION_PAGE_TIMEOUT_MS);
  const close = (wasServed: boolean) => {
    clearTimeout(timeout);
    server.close();
    finish(wasServed);
  };

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return { url: `http://127.0.0.1:${port}${path}`, served };
}
