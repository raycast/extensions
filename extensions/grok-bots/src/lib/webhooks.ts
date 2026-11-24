import { LocalStorage } from "@raycast/api";

/** A Grok Bot routine webhook: POST to `url` with `Authorization: Bearer <key>`. */
export interface Webhook {
  url: string;
  key: string;
}

export type Webhooks = Record<string, Webhook>;

const STORAGE_KEY = "webhooks";

export async function loadWebhooks(): Promise<Webhooks> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Webhooks;
  } catch {
    return {};
  }
}

export async function saveWebhook(botId: string, webhook: Webhook | undefined): Promise<void> {
  const all = await loadWebhooks();
  if (webhook) all[botId] = webhook;
  else delete all[botId];
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

/** Accepts the bare key, or the full "Authorization: Bearer …" header Grok Bot offers to copy. */
export function normalizeKey(input: string): string {
  return input
    .trim()
    .replace(/^authorization:\s*/i, "")
    .replace(/^bearer\s+/i, "")
    .trim();
}

export async function postWebhook(webhook: Webhook, prompt: string): Promise<void> {
  const response = await fetch(webhook.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${webhook.key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt, source: "raycast" }),
  });
  if (response.status !== 200) {
    const detail = (await response.text().catch(() => "")).slice(0, 200);
    throw new Error(`Webhook returned ${response.status}${detail ? `: ${detail}` : ""}`);
  }
}
