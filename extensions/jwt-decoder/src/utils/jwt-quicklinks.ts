import { Alert, confirmAlert, LocalStorage } from "@raycast/api";
import { createDeeplink } from "@raycast/utils";
import { randomUUID } from "node:crypto";

const prefix = "jwt-quicklink:";
const validId = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;

function storedToken(value: unknown): { name: string; token: string } | undefined {
  if (typeof value !== "string") return;
  try {
    const record = JSON.parse(value);
    if (typeof record?.name === "string" && typeof record?.token === "string") return record;
  } catch {
    return undefined;
  }
}

function quicklinkUrl(savedJwtId: string) {
  return createDeeplink({ command: "jwt-view", context: { savedJwtId } });
}

export async function saveQuicklinkToken(name: string, token: string) {
  const savedJwtId = randomUUID();
  const link = quicklinkUrl(savedJwtId);
  try {
    await LocalStorage.setItem(prefix + savedJwtId, JSON.stringify({ name, token }));
  } catch {
    // Raycast's failure toast can attach the error to a public bug report.
    throw new Error("Try again to save the test token on this device.");
  }
  return { savedJwtId, link };
}

export async function readQuicklinkToken(savedJwtId: string) {
  if (!validId.test(savedJwtId)) return;
  return storedToken(await LocalStorage.getItem(prefix + savedJwtId))?.token;
}

export async function forgetQuicklinkToken(savedJwtId: string) {
  if (!validId.test(savedJwtId)) return false;
  const confirmed = await confirmAlert({
    title: "Forget Saved Test Token?",
    message: "Any quicklinks for this token will stop working.",
    primaryAction: { title: "Forget", style: Alert.ActionStyle.Destructive },
  });
  if (!confirmed) return false;
  try {
    await LocalStorage.removeItem(prefix + savedJwtId);
  } catch {
    throw new Error("Try again to remove the saved value.");
  }
  return true;
}

export async function listQuicklinkTokens() {
  return Object.entries(await LocalStorage.allItems())
    .flatMap(([key, value]) => {
      if (!key.startsWith(prefix)) return [];
      const savedJwtId = key.slice(prefix.length);
      const token = storedToken(value);
      if (!validId.test(savedJwtId) || !token) return [];
      return [{ savedJwtId, name: token.name, link: quicklinkUrl(savedJwtId) }];
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}
