import { catalog, keys, type MessageKey } from "./catalog.ts";

export function message(key: MessageKey): string {
  return catalog.en[keys.indexOf(key)];
}

export class LocalizedError extends Error {
  readonly key: MessageKey;
  constructor(key: MessageKey) {
    super(key);
    this.key = key;
    this.name = "LocalizedError";
  }
}

const nativeErrorKeys = [
  "shareFailed",
  "shareDisabled",
  "unsupportedContent",
  "badRequest",
  "emptyText",
  "filesRequired",
  "fileUnavailable",
  "unsupportedKind",
] as const;

export function nativeErrorKey(value: unknown): MessageKey {
  return typeof value === "string" &&
    nativeErrorKeys.some((key) => key === value)
    ? (value as MessageKey)
    : "shareFailed";
}
