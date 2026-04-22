interface FeishuResponse {
  code?: number;
  msg?: string;
  StatusCode?: number;
  StatusMessage?: string;
  data?: Record<string, unknown>;
}

interface FeishuMessagePayload {
  receive_id: string;
  msg_type: "text";
  content: string;
}

export interface SendFeishuTextByUserOptions {
  userAccessToken: string;
  chatId: string;
  text: string;
}

export interface RefreshFeishuUserTokenOptions {
  appId: string;
  appSecret: string;
  refreshToken: string;
}

export interface ExchangeFeishuAuthorizationCodeOptions {
  appId: string;
  appSecret: string;
  code: string;
}

export interface RefreshedFeishuUserToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

function extractFeishuErrorCode(body: unknown): number | undefined {
  if (!body || typeof body !== "object") {
    return undefined;
  }

  const json = body as FeishuResponse;

  if (typeof json.code === "number") {
    return json.code;
  }

  if (typeof json.StatusCode === "number") {
    return json.StatusCode;
  }

  return undefined;
}

function extractFeishuErrorMessage(body: unknown): string | undefined {
  if (!body || typeof body !== "object") {
    return undefined;
  }

  const json = body as FeishuResponse;
  return json.msg ?? json.StatusMessage;
}

function requireNonEmpty(value: string, message: string): string {
  const cleanValue = value.trim();
  if (!cleanValue) {
    throw new Error(message);
  }
  return cleanValue;
}

async function readResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.toLowerCase().includes("application/json");
  return isJson ? await response.json().catch(() => ({})) : await response.text().catch(() => "");
}

function assertHttpOk(response: Response, responseBody: unknown): void {
  if (!response.ok) {
    const responseText = typeof responseBody === "string" ? responseBody : JSON.stringify(responseBody);
    throw new Error(`HTTP ${response.status}: ${responseText}`);
  }
}

function assertFeishuBusinessOk(responseBody: unknown, context: string): void {
  const businessCode = extractFeishuErrorCode(responseBody);
  if (businessCode !== undefined && businessCode !== 0) {
    const businessMessage = extractFeishuErrorMessage(responseBody) ?? "Unknown Feishu error";
    throw new Error(`${context} error ${businessCode}: ${businessMessage}`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function readFirstString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function readFirstNumber(record: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      return value;
    }
  }
  return undefined;
}

function parseAuthTokens(
  responseBody: Record<string, unknown>,
  fallbackRefreshToken?: string,
): RefreshedFeishuUserToken {
  const dataSection = isRecord(responseBody.data) ? responseBody.data : {};
  const accessToken =
    readFirstString(dataSection, ["access_token", "user_access_token"]) ??
    readFirstString(responseBody, ["access_token", "user_access_token"]);
  const nextRefreshToken =
    readFirstString(dataSection, ["refresh_token", "user_refresh_token"]) ??
    readFirstString(responseBody, ["refresh_token", "user_refresh_token"]) ??
    fallbackRefreshToken;
  const expiresIn =
    readFirstNumber(dataSection, ["expires_in", "expire_in", "expires"]) ??
    readFirstNumber(responseBody, ["expires_in", "expire_in", "expires"]) ??
    3600;

  if (!accessToken) {
    throw new Error("Feishu auth response did not contain access token.");
  }
  if (!nextRefreshToken) {
    throw new Error("Feishu auth response did not contain refresh token.");
  }

  return {
    accessToken,
    refreshToken: nextRefreshToken,
    expiresIn,
  };
}

export function buildMessage(body: string, prefixTag: string): string {
  const cleanBody = requireNonEmpty(body, "Message body is empty.");
  const cleanPrefixTag = requireNonEmpty(prefixTag, "Prefix is empty.");
  return `${cleanPrefixTag}：${cleanBody}`;
}

export async function exchangeFeishuAuthorizationCode(
  options: ExchangeFeishuAuthorizationCodeOptions,
  fetchImpl: typeof fetch = fetch,
): Promise<RefreshedFeishuUserToken> {
  const appId = requireNonEmpty(options.appId, "Feishu App ID is empty. Please configure feishuAppId in extension preferences.");
  const appSecret = requireNonEmpty(
    options.appSecret,
    "Feishu App Secret is empty. Please configure feishuAppSecret in extension preferences.",
  );
  const code = requireNonEmpty(options.code, "Authorization code is empty.");

  let response: Response;
  try {
    response = await fetchImpl("https://open.feishu.cn/open-apis/authen/v1/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        app_id: appId,
        app_secret: appSecret,
      }),
    });
  } catch (error) {
    throw new Error(`Network request failed while exchanging authorization code: ${(error as Error).message}`);
  }

  const responseBody = await readResponseBody(response);
  assertHttpOk(response, responseBody);
  assertFeishuBusinessOk(responseBody, "Feishu authorization");

  if (!isRecord(responseBody)) {
    throw new Error("Feishu authorization response format is invalid.");
  }

  return parseAuthTokens(responseBody);
}

export async function refreshFeishuUserAccessToken(
  options: RefreshFeishuUserTokenOptions,
  fetchImpl: typeof fetch = fetch,
): Promise<RefreshedFeishuUserToken> {
  const appId = requireNonEmpty(options.appId, "Feishu App ID is empty. Please configure feishuAppId in extension preferences.");
  const appSecret = requireNonEmpty(
    options.appSecret,
    "Feishu App Secret is empty. Please configure feishuAppSecret in extension preferences.",
  );
  const refreshToken = requireNonEmpty(
    options.refreshToken,
    "Feishu user refresh token is empty. Please configure feishuUserRefreshToken in extension preferences.",
  );

  let response: Response;
  try {
    response = await fetchImpl("https://open.feishu.cn/open-apis/authen/v1/refresh_access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        grant_type: "refresh_token",
        app_id: appId,
        app_secret: appSecret,
        refresh_token: refreshToken,
      }),
    });
  } catch (error) {
    throw new Error(`Network request failed while refreshing user token: ${(error as Error).message}`);
  }

  const responseBody = await readResponseBody(response);
  assertHttpOk(response, responseBody);
  assertFeishuBusinessOk(responseBody, "Feishu token refresh");

  if (!isRecord(responseBody)) {
    throw new Error("Feishu token refresh response format is invalid.");
  }

  return parseAuthTokens(responseBody, refreshToken);
}

export async function sendFeishuTextByUser(
  options: SendFeishuTextByUserOptions,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const userAccessToken = requireNonEmpty(
    options.userAccessToken,
    "Feishu user access token is empty.",
  );
  const chatId = requireNonEmpty(options.chatId, "Feishu Chat ID is empty. Please configure feishuChatId in extension preferences.");

  const payload: FeishuMessagePayload = {
    receive_id: chatId,
    msg_type: "text",
    content: JSON.stringify({ text: options.text }),
  };

  let sendResponse: Response;
  try {
    sendResponse = await fetchImpl("https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=chat_id", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${userAccessToken}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    throw new Error(`Network request failed while sending user message: ${(error as Error).message}`);
  }

  const sendBody = await readResponseBody(sendResponse);
  assertHttpOk(sendResponse, sendBody);
  assertFeishuBusinessOk(sendBody, "Feishu user message");
}
