import { LocalStorage, OAuth, getPreferenceValues, open } from "@raycast/api";
import http from "node:http";
import crypto from "node:crypto";

// OneCalのOAuthメタデータ（https://app.onecal.io/.well-known/oauth-authorization-server で実測）
// - authorization code + PKCE(S256)、動的クライアント登録なし（Settings → MCP Configで静的クライアントを作成する）
//
// 注意: OneCalはリダイレクトURIのクエリ文字列を登録時・リダイレクト時ともに削除するため、
// Raycast標準のWebリダイレクト（https://raycast.com/redirect?packageName=Extension）は
// packageNameが失われて拡張に戻れない。そのためRFC 8252のループバック方式を使う。
// http://localhost:51703/callback をOneCal側のクライアントに登録しておくこと。
const AUTHORIZE_URL = "https://app.onecal.io/api/oauth/authorize";
const TOKEN_URL = "https://app.onecal.io/api/oauth/token";
const SCOPES = "profile email calendars:read offline_access";
const LOOPBACK_PORT = 51703;
const REDIRECT_URI = `http://localhost:${LOOPBACK_PORT}/callback`;
const AUTH_TIMEOUT_MS = 5 * 60 * 1000;
// 保存済みトークンがどのClient IDで発行されたかを記録するキー。
// 設定でクライアントを切り替えた際に、旧クライアントのトークンを使い続けないための照合に使う。
const TOKEN_CLIENT_ID_KEY = "onecal-oauth-client-id";

interface Preferences {
  clientId: string;
  clientSecret: string;
}

// PKCEClientはトークンの永続化・有効期限管理のためだけに使う（認可リダイレクトは自前のループバック）
const tokenStore = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "OneCal",
  providerIcon: "icon.png",
  description:
    "Connect your OneCal account to view events from all synced calendars.",
});

export async function authorize(): Promise<string> {
  const { clientId, clientSecret } = getPreferenceValues<Preferences>();

  const tokenClientId = await LocalStorage.getItem<string>(TOKEN_CLIENT_ID_KEY);
  if (tokenClientId !== clientId) {
    // fail-closed: 発行元Client IDが現在の設定と一致しない（記録が無い場合も含む）トークンは
    // 別クライアント（別アカウントの可能性）のものとみなして破棄し、再認可する
    await tokenStore.removeTokens();
    await LocalStorage.removeItem(TOKEN_CLIENT_ID_KEY);
  }

  const tokenSet = await tokenStore.getTokens();
  if (tokenSet?.accessToken) {
    if (!tokenSet.isExpired()) {
      return tokenSet.accessToken;
    }
    if (tokenSet.refreshToken) {
      const refreshed = await refreshTokens(
        clientId,
        clientSecret,
        tokenSet.refreshToken,
      );
      if (refreshed) {
        await tokenStore.setTokens(refreshed);
        return refreshed.access_token;
      }
    }
  }

  const codeVerifier = base64Url(crypto.randomBytes(32));
  const codeChallenge = base64Url(
    crypto.createHash("sha256").update(codeVerifier).digest(),
  );
  const state = base64Url(crypto.randomBytes(16));

  const authorizeUrl =
    `${AUTHORIZE_URL}?response_type=code` +
    `&client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&scope=${encodeURIComponent(SCOPES)}` +
    `&state=${encodeURIComponent(state)}` +
    `&code_challenge=${encodeURIComponent(codeChallenge)}` +
    `&code_challenge_method=S256`;

  console.log("[onecal] authorize URL:", authorizeUrl);
  const code = await waitForCallback(authorizeUrl, state);

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: REDIRECT_URI,
      code_verifier: codeVerifier,
    }).toString(),
  });
  if (!response.ok) {
    throw new Error(
      `Failed to fetch tokens (${response.status}): ${await safeText(response)}`,
    );
  }
  const tokens = (await response.json()) as OAuth.TokenResponse;
  await tokenStore.setTokens(tokens);
  await LocalStorage.setItem(TOKEN_CLIENT_ID_KEY, clientId);
  return tokens.access_token;
}

/** ループバックHTTPサーバーを立ててブラウザ認可→codeの受け取りまでを行う */
function waitForCallback(
  authorizeUrl: string,
  expectedState: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url ?? "/", `http://localhost:${LOOPBACK_PORT}`);
      if (url.pathname !== "/callback") {
        res.writeHead(404).end();
        return;
      }
      const code = url.searchParams.get("code");
      const returnedState = url.searchParams.get("state");
      const errorParam = url.searchParams.get("error");

      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      if (code && returnedState === expectedState) {
        res.end(
          "<html><body style='font-family:sans-serif'><h2>✅ OneCal authorization complete</h2><p>You can close this tab and return to Raycast.</p></body></html>",
        );
        cleanup();
        resolve(code);
      } else {
        res.end(
          "<html><body style='font-family:sans-serif'><h2>❌ Authorization failed</h2><p>Please try again from Raycast.</p></body></html>",
        );
        cleanup();
        reject(
          new Error(
            errorParam
              ? `Authorization was denied: ${errorParam}`
              : "Received a callback with a mismatched state",
          ),
        );
      }
    });

    const timeout = setTimeout(() => {
      cleanup();
      reject(
        new Error("Authorization timed out (5 minutes). Please try again."),
      );
    }, AUTH_TIMEOUT_MS);

    function cleanup() {
      clearTimeout(timeout);
      server.close();
    }

    server.on("error", (e: NodeJS.ErrnoException) => {
      cleanup();
      reject(
        e.code === "EADDRINUSE"
          ? new Error(
              `Cannot start authorization: port ${LOOPBACK_PORT} is in use. Close the conflicting process and try again.`,
            )
          : e,
      );
    });

    server.listen(LOOPBACK_PORT, "127.0.0.1", () => {
      open(authorizeUrl).catch((e) => {
        cleanup();
        reject(e);
      });
    });
  });
}

async function refreshTokens(
  clientId: string,
  clientSecret: string,
  refreshToken: string,
): Promise<OAuth.TokenResponse | undefined> {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }).toString(),
  });
  if (!response.ok) {
    // リフレッシュ失敗時は再ログインにフォールバック
    await tokenStore.removeTokens();
    return undefined;
  }
  const tokens = (await response.json()) as OAuth.TokenResponse;
  // 一部のサーバーはrefresh応答にrefresh_tokenを含めないため、既存のものを引き継ぐ
  if (!tokens.refresh_token) {
    tokens.refresh_token = refreshToken;
  }
  return tokens;
}

export async function logout(): Promise<void> {
  await tokenStore.removeTokens();
  await LocalStorage.removeItem(TOKEN_CLIENT_ID_KEY);
}

function base64Url(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function safeText(response: Response): Promise<string> {
  try {
    return (await response.text()).slice(0, 300);
  } catch {
    return "(no body)";
  }
}
