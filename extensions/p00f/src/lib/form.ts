import {
  MAX_CLIP_BYTES,
  clampRevealBudget,
  clampTtlMs,
  formatBytes,
  guessMimeFromFilename,
  inferCreateKind,
  isValidPin,
  loneHttpUrl,
  PIN_MAX_LEN,
  PIN_MIN_LEN,
  type CreatedClip,
  type HttpLike,
} from "@p00f/core";
import { basename } from "node:path";
import { createContentPoof, type RaycastClipboardLike } from "./create-service";
import type { CreateDefaults } from "./preferences";

export interface FormPathStats {
  isFile: boolean;
  isDirectory?: boolean;
}

export interface FormDeps {
  http: HttpLike;
  clipboard: RaycastClipboardLike;
  statPath(path: string): Promise<FormPathStats>;
  readFile(path: string): Promise<Uint8Array>;
  maxBytes?: number;
}

export interface CreatePoofFormValues {
  text?: string;
  files?: string[];
  ttl?: string;
  ttlCustomAmount?: string;
  ttlCustomUnit?: "m" | "h" | "d";
  reveals?: string;
  revealsCustomAmount?: string;
  pin?: string;
  secret?: boolean;
  maskedUrl?: boolean;
  revealAnchored?: boolean;
  allowViewerDelete?: boolean;
  requireTurnstile?: boolean;
  showCountdown?: boolean;
}

const te = new TextEncoder();
const TTL_UNIT_MS = { m: 60_000, h: 60 * 60_000, d: 24 * 60 * 60_000 };

export async function createFormPoof(
  deps: FormDeps,
  defaults: CreateDefaults,
  values: CreatePoofFormValues,
): Promise<CreatedClip> {
  const text = values.text ?? "";
  const hasText = text.trim().length > 0;
  const files = values.files?.filter(Boolean) ?? [];
  if (hasText && files.length)
    throw new Error("Choose text or one file, not both");
  if (!hasText && !files.length)
    throw new Error("Enter text or choose one file");
  if (files.length > 1)
    throw new Error("p00f can share one text or file item at a time");

  const base = {
    ...defaults,
    ttlMs: ttlMsFromForm(values, defaults.ttlMs),
    revealBudget: revealBudgetFromForm(values, defaults.revealBudget),
    pin: pinFromForm(values.pin),
    requireTurnstile: values.requireTurnstile ?? defaults.requireTurnstile,
    allowViewerDelete: values.allowViewerDelete ?? defaults.allowViewerDelete,
    revealAnchored: values.revealAnchored ?? defaults.revealAnchored,
    showCountdown: values.showCountdown === false ? false : undefined,
  };

  if (hasText) return createTextFormPoof(deps, base, values, text);
  return await createFileFormPoof(deps, base, files[0]);
}

function ttlMsFromForm(values: CreatePoofFormValues, fallback: number): number {
  if (!values.ttl) return fallback;
  if (values.ttl !== "custom") return clampTtlMs(Number(values.ttl));
  const amount = Number(values.ttlCustomAmount);
  const unit = values.ttlCustomUnit ?? "m";
  if (!Number.isFinite(amount) || amount <= 0)
    throw new Error("Custom TTL must be a positive number");
  return clampTtlMs(amount * TTL_UNIT_MS[unit]);
}

function revealBudgetFromForm(
  values: CreatePoofFormValues,
  fallback: number,
): number {
  if (!values.reveals) return fallback;
  if (values.reveals !== "custom")
    return clampRevealBudget(Number(values.reveals));
  const amount = Number(values.revealsCustomAmount);
  if (!Number.isInteger(amount) || amount < 1)
    throw new Error("Custom Reveals must be a positive whole number");
  return clampRevealBudget(amount);
}

function pinFromForm(pin: string | undefined): string | undefined {
  if (!pin) return undefined;
  if (!isValidPin(pin))
    throw new Error(`PIN must be ${PIN_MIN_LEN} to ${PIN_MAX_LEN} characters`);
  return pin;
}

function createTextFormPoof(
  deps: FormDeps,
  input: CreateDefaults & { pin?: string; showCountdown?: boolean },
  values: CreatePoofFormValues,
  text: string,
): Promise<CreatedClip> {
  if (values.secret && values.maskedUrl)
    throw new Error("Choose either secret or masked URL, not both");
  const masked = values.maskedUrl ? loneHttpUrl(text) : null;
  if (values.maskedUrl && !masked)
    throw new Error("Masked URL mode requires one http(s) URL");
  const payload = masked ?? text;
  const content = te.encode(payload);
  return createContentPoof(deps, {
    ...input,
    content,
    meta: {
      kind: values.secret
        ? "secret"
        : masked
          ? "url"
          : inferCreateKind({ text }),
      mime: "text/plain",
      size: content.length,
    },
  });
}

async function createFileFormPoof(
  deps: FormDeps,
  input: CreateDefaults & { pin?: string; showCountdown?: boolean },
  file: string,
): Promise<CreatedClip> {
  const stats = await deps.statPath(file);
  if (!stats.isFile)
    throw new Error("p00f can share one text or file item at a time");
  const content = await deps.readFile(file);
  const maxBytes = deps.maxBytes ?? MAX_CLIP_BYTES;
  if (content.length > maxBytes)
    throw new Error(`Too big to poof. Max is ${formatBytes(maxBytes)}`);
  const filename = basename(file);
  const mime = guessMimeFromFilename(filename) ?? "application/octet-stream";
  return createContentPoof(deps, {
    ...input,
    content,
    meta: {
      kind: inferCreateKind({ mime, filename }),
      filename,
      mime,
      size: content.length,
    },
  });
}
