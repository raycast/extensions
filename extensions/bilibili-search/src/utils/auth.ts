import fetch from "node-fetch";
import { Cache } from "@raycast/api";

const BASE_PASSPORT_URL = "https://passport.bilibili.com";

export const AUTH_API = {
  generateQRCode: `${BASE_PASSPORT_URL}/x/passport-login/web/qrcode/generate`,
  checkQRCodeStatus: `${BASE_PASSPORT_URL}/x/passport-login/web/qrcode/poll`,
  logout: `${BASE_PASSPORT_URL}/login/exit/v2`,
};

export interface QRCodeResponse {
  code: number;
  message: string;
  ttl: number;
  data: {
    url: string;
    qrcode_key: string;
  };
}

export interface CheckQRCodeResponse {
  code: number;
  message: string;
  ttl: number;
  data: {
    url: string;
    refresh_token: string;
    timestamp: number;
    code: number; // 0: success, 86101: unscanned, 86090: scanned but not confirmed, 86038: expired
    message: string;
  };
}

const cache = new Cache();

export function isLoggedIn(): boolean {
  const cookie = cache.get("cookie");
  // Simple check. Real validation would involve a heartbeat or user info call,
  // but presence of cookie is a good start.
  // We can also check expiration helper if we store it.
  return !!cookie;
}

export async function generateQRCode(): Promise<{
  url: string;
  qrcode_key: string;
}> {
  const response = await fetch(AUTH_API.generateQRCode);
  const json = (await response.json()) as QRCodeResponse;
  if (json.code !== 0) {
    throw new Error(json.message);
  }
  return json.data;
}

export async function checkQRCode(
  qrcodeKey: string,
): Promise<{ success: boolean; cookie?: string; message: string }> {
  try {
    const response = await fetch(
      `${AUTH_API.checkQRCodeStatus}?qrcode_key=${qrcodeKey}`,
    );
    const json = (await response.json()) as CheckQRCodeResponse;

    if (json.data.code === 0) {
      // Success
      const rawCookies = response.headers.raw()["set-cookie"];
      if (rawCookies) {
        const cookieString = rawCookies.map((c) => c.split(";")[0]).join("; ");
        cache.set("cookie", cookieString);
        return {
          success: true,
          cookie: cookieString,
          message: "Login successful",
        };
      }
    }

    return { success: false, message: json.data.message };
  } catch (error) {
    console.error("Check QR Code error:", error);
    return { success: false, message: "Network error" };
  }
}

export async function logout() {
  const cookie = cache.get("cookie");
  if (!cookie) return;

  // Bilibili logout API usually requires POST with bili_jct (csrf)
  // But we can just clear local cookie for essentially logging out of the extension.
  // Ideally call the API too if possible, but extracting csrf is extra work.
  // Let's just clear cache for now as it's sufficient for the plugin.
  cache.remove("cookie");
  return true;
}

export function getCookie(): string {
  return cache.get("cookie") || "";
}
