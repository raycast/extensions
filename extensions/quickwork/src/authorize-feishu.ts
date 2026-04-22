import { getPreferenceValues, open, showToast, Toast } from "@raycast/api";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { writeAuthState } from "./lib/auth-state";
import { exchangeFeishuAuthorizationCode } from "./lib/feishu";

interface CommandPreferences {
  feishuAppId: string;
  feishuAppSecret: string;
  feishuOAuthRedirectUri: string;
}

const OAUTH_SCOPE = "offline_access im:chat:read im:message";
const CALLBACK_TIMEOUT_MS = 180_000;

function buildAuthorizeUrl(appId: string, redirectUri: string, state: string): string {
  const url = new URL("https://open.feishu.cn/open-apis/authen/v1/authorize");
  url.searchParams.set("app_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", OAUTH_SCOPE);
  url.searchParams.set("state", state);
  return url.toString();
}

function parseRedirectUri(redirectUriRaw: string): URL {
  const redirectUri = redirectUriRaw.trim();
  if (!redirectUri) {
    throw new Error("Feishu OAuth Redirect URI is empty. Please configure feishuOAuthRedirectUri.");
  }

  const url = new URL(redirectUri);
  if (url.protocol !== "http:") {
    throw new Error("Only http://localhost or http://127.0.0.1 callback is supported for auto capture.");
  }
  if (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") {
    throw new Error("Redirect URI host must be localhost or 127.0.0.1 for auto capture.");
  }
  if (!url.port) {
    throw new Error("Redirect URI must include an explicit port, e.g. http://127.0.0.1:14520/feishu-callback.");
  }
  if (!url.pathname || url.pathname === "/") {
    throw new Error("Redirect URI must include a callback path, e.g. /feishu-callback.");
  }
  return url;
}

function successHtml(): string {
  return "<html><body><h3>Authorization successful. You can close this tab.</h3></body></html>";
}

function errorHtml(message: string): string {
  return `<html><body><h3>Authorization failed: ${message}</h3></body></html>`;
}

async function waitForAuthorizationCode(redirectUri: URL, expectedState: string, authorizeUrl: string): Promise<string> {
  const port = Number(redirectUri.port);
  const host = redirectUri.hostname;
  const callbackPath = redirectUri.pathname;
  const requestBase = `${redirectUri.protocol}//${host}:${port}`;

  return await new Promise<string>((resolve, reject) => {
    const server = createServer((req, res) => {
      try {
        if (!req.url) {
          res.statusCode = 400;
          res.end(errorHtml("Missing callback URL."));
          return;
        }

        const requestUrl = new URL(req.url, requestBase);
        if (requestUrl.pathname !== callbackPath) {
          res.statusCode = 404;
          res.end(errorHtml("Unexpected callback path."));
          return;
        }

        const state = requestUrl.searchParams.get("state");
        if (state !== expectedState) {
          res.statusCode = 400;
          res.end(errorHtml("Invalid OAuth state."));
          cleanup(() => reject(new Error("OAuth callback state mismatch.")));
          return;
        }

        const authError = requestUrl.searchParams.get("error");
        if (authError) {
          const description = requestUrl.searchParams.get("error_description") ?? authError;
          res.statusCode = 400;
          res.end(errorHtml(description));
          cleanup(() => reject(new Error(`Authorization denied: ${description}`)));
          return;
        }

        const code = requestUrl.searchParams.get("code");
        if (!code) {
          res.statusCode = 400;
          res.end(errorHtml("Missing authorization code."));
          cleanup(() => reject(new Error("Authorization callback did not contain code.")));
          return;
        }

        res.statusCode = 200;
        res.end(successHtml());
        cleanup(() => resolve(code));
      } catch (error) {
        res.statusCode = 500;
        res.end(errorHtml("Callback processing failed."));
        cleanup(() => reject(error as Error));
      }
    });

    let settled = false;
    const timer = setTimeout(() => {
      cleanup(() => reject(new Error("Timed out waiting for authorization callback.")));
    }, CALLBACK_TIMEOUT_MS);

    function cleanup(callback: () => void) {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      server.close(() => callback());
    }

    server.once("error", (error) => {
      cleanup(() => reject(new Error(`Failed to start callback server: ${(error as Error).message}`)));
    });

    server.listen(port, host, async () => {
      try {
        await open(authorizeUrl);
      } catch (error) {
        cleanup(() => reject(new Error(`Failed to open authorization URL: ${(error as Error).message}`)));
      }
    });
  });
}

export default async function Command() {
  const preferences = getPreferenceValues<CommandPreferences>();
  const redirectUri = parseRedirectUri(preferences.feishuOAuthRedirectUri);
  const state = randomUUID();
  const authorizeUrl = buildAuthorizeUrl(preferences.feishuAppId, redirectUri.toString(), state);

  const loadingToast = await showToast({
    style: Toast.Style.Animated,
    title: "Waiting for Feishu authorization",
    message: "Please complete the browser authorization flow.",
  });

  try {
    const code = await waitForAuthorizationCode(redirectUri, state, authorizeUrl);
    const tokens = await exchangeFeishuAuthorizationCode({
      appId: preferences.feishuAppId,
      appSecret: preferences.feishuAppSecret,
      code,
    });

    await writeAuthState({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: Date.now() + tokens.expiresIn * 1000,
    });

    loadingToast.style = Toast.Style.Success;
    loadingToast.title = "Feishu authorized";
    loadingToast.message = "New access token and refresh token were saved.";
  } catch (error) {
    loadingToast.style = Toast.Style.Failure;
    loadingToast.title = "Authorization failed";
    loadingToast.message = (error as Error).message;
  }
}
