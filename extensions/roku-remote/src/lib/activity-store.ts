import type { RokuApp } from "./types";

const key = (id: string) => `roku-direct.activity.v1.${Buffer.from(id).toString("base64url")}`;

export async function getPreviousActivity(deviceId: string): Promise<RokuApp | undefined> {
  const { LocalStorage } = await import("@raycast/api");
  const raw = await LocalStorage.getItem<string>(key(deviceId));
  if (!raw) return undefined;
  try {
    const app = JSON.parse(raw);
    if (app && typeof app.id === "string" && /^[a-zA-Z0-9._-]+$/.test(app.id) && typeof app.name === "string") {
      return { id: app.id, name: app.name, type: typeof app.type === "string" ? app.type : undefined };
    }
  } catch {
    /* Corrupt history must not prevent other controls from working. */
  }
  return undefined;
}

export async function rememberActivity(deviceId: string, app: RokuApp): Promise<void> {
  const { LocalStorage } = await import("@raycast/api");
  await LocalStorage.setItem(key(deviceId), JSON.stringify({ id: app.id, name: app.name, type: app.type }));
}

export async function clearPreviousActivity(deviceId: string): Promise<void> {
  const { LocalStorage } = await import("@raycast/api");
  await LocalStorage.removeItem(key(deviceId));
}
