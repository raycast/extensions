import { LocalStorage, OAuth, getPreferenceValues } from "@raycast/api";

// OneCalのOAuthメタデータ（https://app.onecal.io/.well-known/oauth-authorization-server で実測）
// - authorization code + PKCE(S256)、動的クライアント登録なし（Settings → MCP Configで静的クライアントを作成する）
//
// 注意: OneCalはリダイレクトURIのクエリ文字列を登録時・リダイレクト時ともに削除するため、
// Raycast標準のクエリ付きWebリダイレクト（https://raycast.com/redirect?packageName=Extension）は使えない。
// 代わりに公式が用意しているクエリ不要の https://raycast.com/redirect/extension を
// extraParametersで指定する（https://developers.raycast.com/api-reference/oauth）。
// OneCal側のMCPクライアントにも同じURIを登録しておくこと。
const AUTHORIZE_URL = "https://app.onecal.io/api/oauth/authorize";
const TOKEN_URL = "https://app.onecal.io/api/oauth/token";
const SCOPES = "profile email calendars:read offline_access";
const REDIRECT_URI = "https://raycast.com/redirect/extension";
// 保存済みトークンがどのClient IDで発行されたかを記録するキー。
// 設定でクライアントを切り替えた際に、旧クライアントのトークンを使い続けないための照合に使う。
const TOKEN_CLIENT_ID_KEY = "onecal-oauth-client-id";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "OneCal",
  providerIcon: "icon.png",
  description:
    "Connect your OneCal account to view events from all synced calendars.",
});

// 認可の同時実行ガード。コマンドの再マウント等でauthorize()が並行に呼ばれると
// 認可リクエストが二重生成され、片方のトークン交換がcode/verifier不一致で
// invalid_grantになるため、進行中のフローがあればそれに相乗りする。
let inflightAuthorize: Promise<string> | undefined;

export function authorize(): Promise<string> {
  if (!inflightAuthorize) {
    inflightAuthorize = doAuthorize().finally(() => {
      inflightAuthorize = undefined;
    });
  }
  return inflightAuthorize;
}

async function doAuthorize(): Promise<string> {
  const { clientId, clientSecret } =
    getPreferenceValues<Preferences.UnifiedCalendar>();

  const tokenClientId = await LocalStorage.getItem<string>(TOKEN_CLIENT_ID_KEY);
  if (tokenClientId !== clientId) {
    // fail-closed: 発行元Client IDが現在の設定と一致しない（記録が無い場合も含む）トークンは
    // 別クライアント（別アカウントの可能性）のものとみなして破棄し、再認可する
    await client.removeTokens();
    await LocalStorage.removeItem(TOKEN_CLIENT_ID_KEY);
  }

  const tokenSet = await client.getTokens();
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
        await client.setTokens(refreshed);
        return refreshed.access_token;
      }
    }
  }

  const authRequest = await client.authorizationRequest({
    endpoint: AUTHORIZE_URL,
    clientId,
    scope: SCOPES,
    extraParameters: { redirect_uri: REDIRECT_URI },
  });
  const { authorizationCode } = await client.authorize(authRequest);

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: authorizationCode,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: REDIRECT_URI,
      code_verifier: authRequest.codeVerifier,
    }).toString(),
  });
  if (!response.ok) {
    throw new Error(
      `Failed to fetch tokens (${response.status}): ${await safeText(response)}`,
    );
  }
  const tokens = (await response.json()) as OAuth.TokenResponse;
  await client.setTokens(tokens);
  await LocalStorage.setItem(TOKEN_CLIENT_ID_KEY, clientId);
  return tokens.access_token;
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
    await client.removeTokens();
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
  await client.removeTokens();
  await LocalStorage.removeItem(TOKEN_CLIENT_ID_KEY);
}

async function safeText(response: Response): Promise<string> {
  try {
    return (await response.text()).slice(0, 300);
  } catch {
    return "(no body)";
  }
}
