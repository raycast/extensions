export const MAX_INPUT_LENGTH = 8_000;
export const MAX_CALLBACK_LENGTH = 1_024;
export const MAX_URL_LENGTH = 24_000;
export const MAX_ACTIONS = 100;
export const STORAGE_KEY = "alter-actions-v1";

export interface SavedAction {
  id: string;
  name: string;
  callbackUrl: string;
}

export interface ActionStore {
  version: 1;
  actions: SavedAction[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

/** Only the documented action scheme is accepted; callbacks to other apps are never forwarded. */
export function normalizeCallback(raw: string): string {
  const value = raw.trim();
  if (!value || value.length > MAX_CALLBACK_LENGTH) {
    throw new Error(
      "Paste the URL Callback copied from Alter (up to 1,024 characters).",
    );
  }
  if (/\s/.test(value))
    throw new Error(
      "The callback URL cannot contain unencoded spaces or line breaks.",
    );

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(
      "Use an Alter callback such as alter://action/your-action-id.",
    );
  }
  if (
    url.protocol !== "alter:" ||
    url.hostname !== "action" ||
    url.username ||
    url.password ||
    url.port ||
    url.hash
  ) {
    throw new Error("Only alter://action/action-id callbacks are supported.");
  }
  const rawPath = value.match(/^alter:\/\/action([^?#]*)/i)?.[1];
  if (!/^\/[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(rawPath ?? "")) {
    throw new Error(
      "The action ID must be one segment containing letters, numbers, hyphens, or underscores.",
    );
  }
  const keys = Array.from(url.searchParams.keys());
  if (keys.some((key) => key !== "input") || keys.length > 1) {
    throw new Error(
      "Only one optional input parameter is supported. Copy a plain Alter action callback.",
    );
  }
  // The copied URL's example input is replaced by the text explicitly reviewed in Raycast.
  url.search = "";
  return url.toString();
}

export function validateName(raw: string): string {
  const name = raw.trim();
  const hasControlCharacter = Array.from(name).some(
    (char) => char.charCodeAt(0) <= 31 || char.charCodeAt(0) === 127,
  );
  if (!name || name.length > 80 || hasControlCharacter) {
    throw new Error(
      "Give the action a name between 1 and 80 characters without line breaks.",
    );
  }
  return name;
}

export function buildActionUrl(callback: string, input: string): string {
  if (input.length > MAX_INPUT_LENGTH) {
    throw new Error(
      "The input is too long. Keep it under 8,000 characters or paste it directly into Alter.",
    );
  }
  const url = new URL(normalizeCallback(callback));
  if (input.length > 0) url.searchParams.set("input", input);
  const result = url.toString();
  if (result.length > MAX_URL_LENGTH) {
    throw new Error(
      "The encoded input is too long for a callback URL. Shorten it or paste it into Alter.",
    );
  }
  return result;
}

/** Corrupt storage fails closed and remains untouched until the user explicitly resets it. */
export function parseStore(raw: string | undefined): ActionStore {
  if (raw === undefined) return { version: 1, actions: [] };
  if (typeof raw !== "string")
    throw new Error("Saved action data must be stored as text.");
  if (raw.length > 200_000)
    throw new Error("Saved action data exceeds the supported size.");
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error(
      "Saved action data is unreadable. Export it for recovery or reset saved actions.",
    );
  }
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    !Array.isArray(value.actions) ||
    value.actions.length > MAX_ACTIONS
  ) {
    throw new Error("Saved action data has an unsupported format.");
  }
  const ids = new Set<string>();
  const actions = value.actions.map((item: unknown) => {
    if (
      !isRecord(item) ||
      typeof item.id !== "string" ||
      !/^[a-zA-Z0-9-]{1,80}$/.test(item.id) ||
      ids.has(item.id) ||
      typeof item.name !== "string" ||
      typeof item.callbackUrl !== "string"
    ) {
      throw new Error(
        "Saved action data contains an invalid or duplicate action.",
      );
    }
    ids.add(item.id);
    return {
      id: item.id,
      name: validateName(item.name),
      callbackUrl: normalizeCallback(item.callbackUrl),
    };
  });
  return { version: 1, actions };
}

export function serializeActions(actions: SavedAction[]): string {
  const checked = parseStore(JSON.stringify({ version: 1, actions }));
  return JSON.stringify(checked);
}

export function upsertAction(
  actions: SavedAction[],
  action: SavedAction,
): SavedAction[] {
  const existing = actions.some((item) => item.id === action.id);
  if (!existing && actions.length >= MAX_ACTIONS)
    throw new Error("You can save up to 100 Alter actions.");
  const updated = existing
    ? actions.map((item) => (item.id === action.id ? action : item))
    : [...actions, action];
  return parseStore(serializeActions(updated)).actions;
}

export function removeAction(
  actions: SavedAction[],
  id: string,
): SavedAction[] {
  return actions.filter((item) => item.id !== id);
}

export function escapeMarkdown(value: string): string {
  return Array.from(value)
    .map((char) => ("\\`*_{}[]()#+.!|<>~-".includes(char) ? `\\${char}` : char))
    .join("");
}

export function fencedInputPreview(input: string): string {
  const runs = input.match(/`+/g) ?? [];
  const fence = "`".repeat(Math.max(3, ...runs.map((run) => run.length + 1)));
  return `${fence}text\n${input}\n${fence}`;
}
