import type {
  DdgDashboardResponse,
  DdgGenerateAddressResponse,
  DdgLoginResponse,
} from "../types/ddg";
import { DdgApiError } from "./errors";
import { normalizeOtp, normalizeUsername } from "./validation";

const DDG_API_ENDPOINT = "https://quack.duckduckgo.com/api";
const DDG_API_USER_AGENT =
  "Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/109.0.5414.86 Mobile DuckDuckGo/5 Safari/537.36";

async function fetchDdg(path: string, init?: RequestInit) {
  let response: Response;

  try {
    response = await fetch(`${DDG_API_ENDPOINT}${path}`, {
      ...init,
      headers: {
        "User-Agent": DDG_API_USER_AGENT,
        ...init?.headers,
      },
    });
  } catch {
    throw new DdgApiError(
      "Could Not Reach DuckDuckGo",
      "Check your network connection and try again.",
    );
  }

  if (!response.ok) {
    throw toApiError(response);
  }

  return response;
}

function toApiError(response: Response) {
  if (response.status === 401) {
    return new DdgApiError(
      "Token Invalid or Expired",
      "Clear the stored session or update your access token.",
      401,
    );
  }

  if (response.status === 429) {
    return new DdgApiError(
      "Too Many Requests",
      "DuckDuckGo is rate limiting requests. Try again later.",
      429,
    );
  }

  return new DdgApiError(
    "DuckDuckGo Request Failed",
    `${response.status} ${response.statusText || "Unknown error"}`,
    response.status,
  );
}

async function readJson<T>(response: Response): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    throw new DdgApiError(
      "Unexpected DuckDuckGo Response",
      "DuckDuckGo returned a response that could not be parsed.",
    );
  }
}

export async function requestLoginLink(username: string) {
  const normalizedUsername = normalizeUsername(username);
  await fetchDdg(
    `/auth/loginlink?user=${encodeURIComponent(normalizedUsername)}`,
  );
}

export async function loginWithOtp(username: string, otp: string) {
  const normalizedUsername = normalizeUsername(username);
  const normalizedOtp = normalizeOtp(otp);
  const response = await fetchDdg(
    `/auth/login?otp=${normalizedOtp}&user=${encodeURIComponent(normalizedUsername)}`,
  );
  const data = await readJson<DdgLoginResponse>(response);

  if (!data.token) {
    throw new DdgApiError(
      "Unexpected DuckDuckGo Response",
      "The login response did not include a session token.",
    );
  }

  return data;
}

export async function getDashboard(token: string) {
  let response: Response;

  try {
    response = await fetchDdg("/email/dashboard", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (error) {
    if (error instanceof DdgApiError && error.status === 401) {
      throw new DdgApiError(
        "One-Time Passphrase Rejected",
        "Request a new passphrase and enter it before it expires.",
        401,
      );
    }

    throw error;
  }

  const data = await readJson<DdgDashboardResponse>(response);

  if (!data.user?.access_token) {
    throw new DdgApiError(
      "Unexpected DuckDuckGo Response",
      "The dashboard response did not include an access token.",
    );
  }

  return data;
}

export async function generateAddress(accessToken: string) {
  const response = await fetchDdg("/email/addresses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const data = await readJson<DdgGenerateAddressResponse>(response);

  if (!data.address) {
    throw new DdgApiError(
      "Unexpected DuckDuckGo Response",
      "DuckDuckGo did not return a generated alias.",
    );
  }

  return {
    alias: data.address,
    fullAddress: `${data.address}@duck.com`,
  };
}
