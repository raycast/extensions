import { getPreferenceValues, OAuth } from "@raycast/api";

// URL構築のヘルパー関数
function buildUrl(domain: string, path: string): string {
  if (domain.startsWith("https://") || domain.startsWith("http://")) {
    return `${domain}${path}`;
  }
  return `https://${domain}${path}`;
}

type Prefs = {
  larkDomain: string;
  appId: string;
  appSecret: string;
  receiveIdType: "email" | "open_id";
  receiveId: string;
  prefixTimestamp?: boolean;
};

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Lark",
  providerIcon: "icon.png",
  description: "Connect your Lark account to send messages as yourself",
});

export async function authorize(): Promise<void> {
  const { larkDomain, appId } = getPreferenceValues<Prefs>();

  const authRequest = await client.authorizationRequest({
    endpoint: buildUrl(larkDomain, "/open-apis/authen/v1/authorize"),
    clientId: appId,
    scope: "im:message:send_as_user contact:user.id:readonly",
  });

  const { authorizationCode } = await client.authorize(authRequest);
  await exchangeCodeForTokens(authorizationCode);
}

async function exchangeCodeForTokens(code: string): Promise<void> {
  const { larkDomain, appId, appSecret } = getPreferenceValues<Prefs>();

  const response = await fetch(buildUrl(larkDomain, "/open-apis/authen/v1/oidc/access_token"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code: code,
      client_id: appId,
      client_secret: appSecret,
    }),
  });

  const data: any = await response.json();
  if (!response.ok || data.code !== 0) {
    throw new Error(`OAuth error: ${data.code} ${data.msg}`);
  }

  await client.setTokens({
    accessToken: data.data.access_token,
    refreshToken: data.data.refresh_token,
    idToken: data.data.id_token,
  });
}

export async function getUserAccessToken(): Promise<string> {
  const tokens = await client.getTokens();

  if (!tokens?.accessToken) {
    await authorize();
    const newTokens = await client.getTokens();
    return newTokens?.accessToken || "";
  }

  return tokens.accessToken;
}

export async function sendUserMessage(text: string): Promise<void> {
  const token = await getUserAccessToken();
  const { larkDomain, receiveId } = getPreferenceValues<Prefs>();

  const response = await fetch(
    buildUrl(larkDomain, "/open-apis/im/v1/messages?receive_id_type=user_id"),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        receive_id: receiveId,
        msg_type: "text",
        content: JSON.stringify({ text }),
      }),
    }
  );

  const data: any = await response.json();
  if (!response.ok || data.code !== 0) {
    throw new Error(`Send message error: ${data.code} ${data.msg}`);
  }
}
