import { LocalStorage, Toast, open, showToast } from "@raycast/api";
import {
  ACCESS_CACHE_KEY,
  AUTH_API_URL,
  PRODUCT,
  SESSION_TOKEN_KEY,
} from "./constants";
import type { ExtensionAccess } from "./types";
import { readJson, writeJson } from "./storage";

type DeviceStartResponse = {
  deviceCode?: unknown;
  verificationUriComplete?: unknown;
  expiresIn?: unknown;
  interval?: unknown;
  error?: unknown;
};

type DeviceStatusResponse = {
  status?: unknown;
  token?: unknown;
  access?: unknown;
  error?: unknown;
};

export async function getSessionToken(): Promise<string> {
  return (await LocalStorage.getItem<string>(SESSION_TOKEN_KEY)) || "";
}

export async function getCachedAccess(): Promise<ExtensionAccess | undefined> {
  return readJson<ExtensionAccess | undefined>(ACCESS_CACHE_KEY, undefined);
}

export async function refreshAccess(): Promise<{
  token: string;
  access?: ExtensionAccess;
}> {
  const token = await getSessionToken();
  if (!token) return { token: "" };

  try {
    const response = await fetch(`${AUTH_API_URL}/entitlements/me`, {
      headers: {
        accept: "application/json",
        authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 401) {
      await clearSession();
      return { token: "" };
    }

    if (!response.ok) {
      return { token, access: await getCachedAccess() };
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const access = normalizeAccess(payload.access);
    if (access) await writeJson(ACCESS_CACHE_KEY, access);
    return { token, access };
  } catch {
    return { token, access: await getCachedAccess() };
  }
}

export async function beginSignIn(): Promise<{
  token: string;
  access: ExtensionAccess;
}> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Opening IconSearch sign-in",
    message: "Approve the browser link to connect Raycast.",
  });

  try {
    const startResponse = await fetch(`${AUTH_API_URL}/device/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        product: PRODUCT,
        clientName: "Raycast",
      }),
    });
    const startPayload = (await startResponse.json()) as DeviceStartResponse;
    if (!startResponse.ok)
      throw new Error(
        stringFrom(startPayload.error) || "Could not start sign-in.",
      );

    const deviceCode = stringFrom(startPayload.deviceCode);
    const verificationUrl = stringFrom(startPayload.verificationUriComplete);
    if (!deviceCode || !verificationUrl)
      throw new Error("The sign-in response was incomplete.");

    await open(verificationUrl);

    const expiresIn = numberFrom(startPayload.expiresIn, 600);
    const interval = Math.max(2, numberFrom(startPayload.interval, 3));
    const deadline = Date.now() + expiresIn * 1000;
    toast.title = "Waiting for approval";
    toast.message =
      "Finish sign-in in your browser. Raycast will update automatically.";

    while (Date.now() < deadline) {
      await delay(interval * 1000);

      const statusResponse = await fetch(`${AUTH_API_URL}/device/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({ deviceCode }),
      });
      const statusPayload =
        (await statusResponse.json()) as DeviceStatusResponse;
      const status = stringFrom(statusPayload.status);

      if (status === "pending") continue;
      if (status === "authorized") {
        const token = stringFrom(statusPayload.token);
        const access = normalizeAccess(statusPayload.access);
        if (!token || !access)
          throw new Error("The approved session was incomplete.");

        await LocalStorage.setItem(SESSION_TOKEN_KEY, token);
        await writeJson(ACCESS_CACHE_KEY, access);

        toast.style = Toast.Style.Success;
        toast.title = "IconSearch connected";
        toast.message = formatAccessLabel(access);
        return { token, access };
      }

      throw new Error(
        stringFrom(statusPayload.error) ||
          "The sign-in link expired. Please try again.",
      );
    }

    throw new Error("The sign-in link expired. Please try again.");
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not connect IconSearch";
    toast.message =
      error instanceof Error ? error.message : "Unknown sign-in error.";
    throw error;
  }
}

export async function signOut(): Promise<void> {
  const token = await getSessionToken();
  if (token) {
    try {
      await fetch(`${AUTH_API_URL}/device/revoke`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
      });
    } catch {
      // Local sign-out still removes the token if the network is unavailable.
    }
  }

  await clearSession();
  await showToast({
    style: Toast.Style.Success,
    title: "Signed out of IconSearch",
  });
}

async function clearSession() {
  await LocalStorage.removeItem(SESSION_TOKEN_KEY);
  await LocalStorage.removeItem(ACCESS_CACHE_KEY);
}

function normalizeAccess(value: unknown): ExtensionAccess | undefined {
  if (!value || typeof value !== "object") return undefined;
  const item = value as Record<string, unknown>;
  const product = stringFrom(item.product);
  const tier = stringFrom(item.tier);
  const expiresAt = stringFrom(item.expiresAt);

  if (
    product !== PRODUCT ||
    (tier !== "free" && tier !== "founder") ||
    !expiresAt
  )
    return undefined;

  return {
    email: stringFrom(item.email),
    product,
    tier,
    founderNumber:
      typeof item.founderNumber === "number" ? item.founderNumber : null,
    expiresAt,
  };
}

function formatAccessLabel(access: ExtensionAccess): string {
  if (access.tier === "founder" && access.founderNumber)
    return `Founder #${access.founderNumber}`;
  return "Free access is active.";
}

function stringFrom(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function numberFrom(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}
