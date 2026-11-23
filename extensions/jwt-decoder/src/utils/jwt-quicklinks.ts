import { environment, LocalStorage } from "@raycast/api";
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
  const url = new URL(`raycast://extensions/${environment.ownerOrAuthorName}/${environment.extensionName}/jwt-view`);
  url.searchParams.set("context", JSON.stringify({ savedJwtId }));
  return url.href;
}

export async function saveQuicklinkToken(name: string, token: string) {
  const savedJwtId = randomUUID();
  const link = quicklinkUrl(savedJwtId);
  await LocalStorage.setItem(prefix + savedJwtId, JSON.stringify({ name, token }));
  return { savedJwtId, link };
}

export async function readQuicklinkToken(savedJwtId: string) {
  if (!validId.test(savedJwtId)) return;
  return storedToken(await LocalStorage.getItem(prefix + savedJwtId))?.token;
}

export async function forgetQuicklinkToken(savedJwtId: string) {
  if (validId.test(savedJwtId)) await LocalStorage.removeItem(prefix + savedJwtId);
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
