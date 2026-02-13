import { getPreferenceValues, LocalStorage } from "@raycast/api";
import {
  commonHeaders,
  IS_LOGINED_USING_WEB,
  JWT_TOKEN_STORAGE_KEY,
  JWT_TOKEN_TIMESTAMP_KEY,
  LAST_LMS_LOGIN_LINK_KEY,
  LAST_LMS_LOGIN_TIMESTAMP_KEY,
  ONE_HOUR_IN_MS,
} from "./constants";
import { fetchWithCookies } from "./utils";

export async function getSSOUrl({
  forLogin,
  retryCount = 0,
}: {
  forLogin: boolean;
  retryCount?: number;
}): Promise<{ status: "old" | "new"; loginLink: string } | undefined> {
  const now = Date.now();

  const [lastLoginString, lastLoginLink, isLoginedUsingWeb] = await Promise.all([
    LocalStorage.getItem<string>(LAST_LMS_LOGIN_TIMESTAMP_KEY),
    LocalStorage.getItem<string>(LAST_LMS_LOGIN_LINK_KEY),
    LocalStorage.getItem<boolean>(IS_LOGINED_USING_WEB),
  ]);
  const lastLogin = parseInt(lastLoginString || "0");

  if (lastLoginLink && now - lastLogin < ONE_HOUR_IN_MS) {
    if (forLogin) await LocalStorage.setItem(IS_LOGINED_USING_WEB, true);
    return { status: isLoginedUsingWeb ? "old" : "new", loginLink: lastLoginLink };
  }

  const { userid, password } = getPreferenceValues<ExtensionPreferences>();

  const loginResponse = await fetchWithCookies("https://sso.aztu.edu.az/Home/Login", {
    method: "POST",
    redirect: "manual",
    headers: {
      ...commonHeaders,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `UserId=${encodeURIComponent(userid)}&Password=${encodeURIComponent(password)}`,
  });

  const redirectURL = loginResponse.headers.get("location");
  if (!redirectURL) {
    console.error("helpers.tsx: getSSOUrl() Redirect URL couldn't found!");
    return undefined;
  }

  const nextUrl = redirectURL.startsWith("http") ? redirectURL : `https://sso.aztu.edu.az${redirectURL}`;

  const followUpResponse = await fetchWithCookies(nextUrl, { headers: commonHeaders });

  const html = await followUpResponse.text();

  const match = html.match(/<a[^>]+href="([^"]*admin_menu\/login\.php\?param=[^"]+)"[^>]*>/i);

  if (!match) {
    console.error("helpers.tsx: getSSOUrl() Login link not found in HTML");
    return undefined;
  }

  const loginLink = match[1];

  const checkLoginLinkResponse = await fetchWithCookies(loginLink, { headers: commonHeaders });
  const text = await checkLoginLinkResponse.text();

  if (text === "\nuğursuz cəhd") {
    if (retryCount >= 3) {
      console.error("helpers.tsx: getSSOUrl() Max retries exceeded");
      return undefined;
    }
    console.error("helpers.tsx: getSSOUrl() Uğursuz cəhd. Trying Again...!");
    return await getSSOUrl({ forLogin, retryCount: retryCount + 1 });
  }

  await Promise.all([
    LocalStorage.setItem(LAST_LMS_LOGIN_LINK_KEY, loginLink),
    LocalStorage.setItem(LAST_LMS_LOGIN_TIMESTAMP_KEY, now.toString()),
    LocalStorage.setItem(IS_LOGINED_USING_WEB, forLogin),
  ]);

  return { status: "new", loginLink: loginLink };
}

export async function getJWTToken(): Promise<string> {
  const [savedToken, savedTimeStr] = await Promise.all([
    LocalStorage.getItem<string>(JWT_TOKEN_STORAGE_KEY),
    LocalStorage.getItem<string>(JWT_TOKEN_TIMESTAMP_KEY),
  ]);
  const savedTime = parseInt(savedTimeStr || "0");

  const now = Date.now();

  if (savedToken && now - savedTime < ONE_HOUR_IN_MS) {
    return savedToken;
  }

  const newToken = await generateJWTToken();

  if (newToken) {
    const now = Date.now();
    await Promise.all([
      LocalStorage.setItem(JWT_TOKEN_STORAGE_KEY, newToken),
      LocalStorage.setItem(JWT_TOKEN_TIMESTAMP_KEY, now.toString()),
    ]);
    return newToken;
  }

  throw new Error("JWT Authorization Token couldn't be generated");
}

async function generateJWTToken(retryCount = 0): Promise<string | undefined> {
  const { userid, password } = getPreferenceValues<ExtensionPreferences>();

  const loginResponse = await fetchWithCookies("https://api-lms.aztu.edu.az/api/api-login", {
    body: JSON.stringify({ user_id: userid, password }),
    method: "POST",
    headers: {
      ...commonHeaders,
    },
  });

  const data = (await loginResponse.json()) as ApiLoginResult;

  if (data.status && data.status === "success") return data.token;
  else if (retryCount < 3) {
    console.warn(`helpers.tsx: generateJWTToken(). Retrying...`);
    return await generateJWTToken(retryCount + 1);
  } else {
    console.error("helpers.tsx: generateJWTToken() Token couldn't found!");
    console.error("Error:", data.message);
    return undefined;
  }
}

export type ApiLoginResult = {
  status: string;
  user_id: string;
  token: string;
  message: string;
  server_time: number;
  server_time_iso: string;
  allowed_skew_seconds: number;
};
