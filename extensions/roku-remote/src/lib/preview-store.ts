import { randomUUID } from "node:crypto";
import { access, mkdir, open } from "node:fs/promises";
import { join } from "node:path";
import type { PreparedInstruction } from "./automation";
import { validateRoutine } from "./routines";

export const PREVIEW_TTL_MS = 10 * 60 * 1000;
const PREFIX = "roku-direct.ai-preview.v2.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
type Claim = "created" | "consumed";

export interface PreviewClaims {
  /** Atomically reserve a claim; false means another call already owns it. */
  claim(id: string, purpose: Claim): Promise<boolean>;
  claimed(id: string, purpose: Claim): Promise<boolean>;
}

export interface PreviewStorage extends PreviewClaims {
  allItems(): Promise<Record<string, unknown>>;
  getItem(key: string): Promise<unknown>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface InstructionPreview {
  previewId: string;
  deviceId: string;
  createdAt: number;
  expiresAt: number;
  prepared: PreparedInstruction;
}

function object(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function text(value: unknown, max = 256): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}

function invalid(): never {
  throw new Error("This Roku preview is invalid. Create a new preview before running it.");
}

function validateId(id: string): void {
  if (typeof id !== "string" || !UUID.test(id)) invalid();
}

function validatePrepared(value: unknown, deviceId: string): asserts value is PreparedInstruction {
  const prepared = object(value);
  const plan = object(prepared?.plan);
  if (
    !text(deviceId) ||
    !plan ||
    !text(plan.text, 2000) ||
    !Array.isArray(plan.steps) ||
    plan.steps.length < 1 ||
    plan.steps.length > 10 ||
    !Array.isArray(plan.preview) ||
    plan.preview.length !== plan.steps.length ||
    !plan.preview.every((line) => text(line, 2048)) ||
    !Array.isArray(prepared?.routines)
  )
    invalid();
  const routines = prepared.routines.map((routine) => validateRoutine(routine));
  if (routines.some((routine) => routine.deviceId !== deviceId)) invalid();
  for (const value of plan.steps) {
    const step = object(value);
    if (!step || step.deviceId !== deviceId || !text(step.deviceName) || typeof step.explicitTarget !== "boolean")
      invalid();
    switch (step.kind) {
      case "launch":
        if (!text(step.appId, 128) || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(step.appId) || !text(step.appName, 2048))
          invalid();
        break;
      case "keypress":
        if (
          !text(step.key, 32) ||
          !/^[a-zA-Z]+$/.test(step.key) ||
          !Number.isInteger(step.count) ||
          Number(step.count) < 1 ||
          Number(step.count) > 20
        )
          invalid();
        break;
      case "restore":
        break;
      case "routine":
        if (
          !text(step.routineId, 128) ||
          !text(step.routineName, 80) ||
          !routines.some((routine) => routine.id === step.routineId)
        )
          invalid();
        break;
      default:
        invalid();
    }
  }
}

function decode(raw: unknown, id: string): InstructionPreview {
  try {
    if (typeof raw !== "string") invalid();
    const value = object(JSON.parse(raw));
    if (
      !value ||
      value.version !== 1 ||
      value.previewId !== id ||
      !text(value.deviceId) ||
      typeof value.createdAt !== "number" ||
      !Number.isFinite(value.createdAt) ||
      typeof value.expiresAt !== "number" ||
      value.expiresAt !== value.createdAt + PREVIEW_TTL_MS
    )
      invalid();
    validatePrepared(value.prepared, value.deviceId);
    return {
      previewId: id,
      deviceId: value.deviceId,
      createdAt: value.createdAt,
      expiresAt: value.expiresAt,
      prepared: value.prepared,
    };
  } catch {
    invalid();
  }
}

/** Content is immutable; separate atomic claims make IDs single-use across processes. */
export function createPreviewStore(
  storage: PreviewStorage,
  options: { now?: () => number; newId?: () => string } = {},
) {
  const now = options.now ?? Date.now;
  const newId = options.newId ?? randomUUID;

  async function pruneExpired(): Promise<void> {
    for (const [key, raw] of Object.entries(await storage.allItems())) {
      if (!key.startsWith(PREFIX)) continue;
      try {
        const entry = decode(raw, key.slice(PREFIX.length));
        if (entry.createdAt <= now() && now() < entry.expiresAt) continue;
      } catch {
        /* Remove only unusable preview records; retain atomic identity claims. */
      }
      await storage.removeItem(key);
    }
  }

  async function savePreview(prepared: PreparedInstruction, deviceId: string): Promise<InstructionPreview> {
    validatePrepared(prepared, deviceId);
    // Snapshot synchronously so a caller cannot mutate the plan while storage awaits.
    const snapshot = JSON.parse(JSON.stringify(prepared)) as PreparedInstruction;
    await pruneExpired();
    for (let attempt = 0; attempt < 10; attempt++) {
      const previewId = newId();
      validateId(previewId);
      if (!(await storage.claim(previewId, "created"))) continue;
      const createdAt = now();
      const entry = { previewId, deviceId, createdAt, expiresAt: createdAt + PREVIEW_TTL_MS, prepared: snapshot };
      await storage.setItem(PREFIX + previewId, JSON.stringify({ version: 1, ...entry }));
      return entry;
    }
    throw new Error("Could not create a unique Roku preview. Try previewing again.");
  }

  async function getPreview(previewId: string): Promise<InstructionPreview> {
    validateId(previewId);
    if (await storage.claimed(previewId, "consumed"))
      throw new Error("This Roku preview was already used. Create a new preview before running again.");
    const raw = await storage.getItem(PREFIX + previewId);
    if (raw === undefined || raw === null)
      throw new Error("This Roku preview is missing or expired. Create a new preview before running it.");
    const entry = decode(raw, previewId);
    if (entry.createdAt > now() || now() >= entry.expiresAt) {
      await storage.removeItem(PREFIX + previewId);
      throw new Error("This Roku preview expired. Create a new preview before running it.");
    }
    return entry;
  }

  async function consumePreview(previewId: string): Promise<InstructionPreview> {
    const entry = await getPreview(previewId);
    if (!(await storage.claim(previewId, "consumed")))
      throw new Error("This Roku preview was already used. Create a new preview before running again.");
    // Burn the token before returning even if deletion fails or the later command fails.
    await storage.removeItem(PREFIX + previewId);
    if (entry.createdAt > now() || now() >= entry.expiresAt)
      throw new Error("This Roku preview expired. Create a new preview before running it.");
    return entry;
  }

  return { savePreview, getPreview, consumePreview };
}

/** Empty claim files contain no plan data and remain as ID/replay tombstones. */
export function createFilePreviewClaims(directory: string): PreviewClaims {
  function path(id: string, purpose: Claim): string {
    validateId(id);
    return join(directory, `${id}.${purpose}`);
  }
  return {
    async claim(id, purpose) {
      const filename = path(id, purpose);
      await mkdir(directory, { recursive: true, mode: 0o700 });
      try {
        const file = await open(filename, "wx", 0o600);
        await file.close();
        return true;
      } catch (error) {
        if (object(error)?.code === "EEXIST") return false;
        throw error;
      }
    },
    async claimed(id, purpose) {
      try {
        await access(path(id, purpose));
        return true;
      } catch (error) {
        if (object(error)?.code === "ENOENT") return false;
        throw error;
      }
    },
  };
}

let defaultStore: Promise<ReturnType<typeof createPreviewStore>> | undefined;
function localStore() {
  return (defaultStore ??= import("@raycast/api").then(({ LocalStorage, environment }) =>
    createPreviewStore({
      allItems: () => LocalStorage.allItems(),
      getItem: (key) => LocalStorage.getItem<string>(key),
      setItem: (key, value) => LocalStorage.setItem(key, value),
      removeItem: (key) => LocalStorage.removeItem(key),
      ...createFilePreviewClaims(join(environment.supportPath, "roku-preview-claims")),
    }),
  ));
}

export async function saveInstructionPreview(prepared: PreparedInstruction, deviceId: string) {
  return (await localStore()).savePreview(prepared, deviceId);
}

export async function getInstructionPreview(previewId: string) {
  return (await localStore()).getPreview(previewId);
}

export async function consumeInstructionPreview(previewId: string) {
  return (await localStore()).consumePreview(previewId);
}
