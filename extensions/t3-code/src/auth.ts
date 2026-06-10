import { TokenExchangeResponse } from "./types";

const TOKEN_EXCHANGE_TIMEOUT_MS = 10000;

export function parsePairingInput(raw: string): {
  baseUrl: string;
  token: string;
} {
  const trimmed = raw.trim();
  try {
    const url = new URL(
      trimmed.includes("://") ? trimmed : `https://${trimmed}`,
    );
    const hashParams = new URLSearchParams(url.hash.slice(1));
    const token =
      hashParams.get("token") ?? url.searchParams.get("token") ?? "";
    url.hash = "";
    url.search = "";
    url.pathname = "/";
    return { baseUrl: url.toString().replace(/\/$/, ""), token };
  } catch {
    return { baseUrl: trimmed, token: "" };
  }
}

export async function exchangeToken(
  baseUrl: string,
  oneTimeToken: string,
): Promise<TokenExchangeResponse> {
  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
    subject_token: oneTimeToken,
    subject_token_type: "urn:t3:params:oauth:token-type:environment-bootstrap",
    requested_token_type: "urn:ietf:params:oauth:token-type:access_token",
    scope: "orchestration:read orchestration:operate",
    client_label: "Raycast Extension",
    client_device_type: "desktop",
    client_os: process.platform === "darwin" ? "macOS" : "Windows",
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TOKEN_EXCHANGE_TIMEOUT_MS);

  try {
    const resp = await fetch(`${baseUrl}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      signal: controller.signal,
    });

    if (resp.status === 401 || resp.status === 403) {
      throw new Error("Token rejected — generate a new pairing URL in T3 Code");
    }
    if (!resp.ok) {
      throw new Error(`Server returned ${resp.status}`);
    }

    return (await resp.json()) as TokenExchangeResponse;
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("Connection timed out — check URL and try again");
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
