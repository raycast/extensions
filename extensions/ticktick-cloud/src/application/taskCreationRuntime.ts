import { ProtocolError } from "../domain/errors";
import type { CreateTaskInput, Task } from "../domain/task";
import { TaskCreationService } from "./TaskCreationService";
import { isTrustedReadyCommandRuntime, type ReadyCommandRuntime } from "./commandRuntime";

export type ReadyTaskCreationRuntime = Readonly<{
  kind: "ready";
  contextKey: string;
  createTask(input: CreateTaskInput): Promise<Task>;
}>;

const INVALID_RUNTIME_MESSAGE = "TickTick task creation runtime is invalid.";

export function projectTaskCreationRuntime(runtime: ReadyCommandRuntime): ReadyTaskCreationRuntime {
  if (!isTrustedReadyCommandRuntime(runtime) || !isObject(runtime)) throw invalidRuntime();

  const kind = readBoundary(() => runtime.kind);
  const contextKey = readBoundary(() => runtime.contextKey);
  const accountKey = readBoundary(() => runtime.accountKey);
  const creationService = readBoundary(() => runtime.creationService);
  const isCreationService = readBoundary(() => creationService instanceof TaskCreationService);

  if (kind !== "ready" || !isOpaqueContextKey(contextKey) || !isSafeAccountKey(accountKey) || !isCreationService) {
    throw invalidRuntime();
  }

  const create = readBoundary(() => creationService.create);
  if (typeof create !== "function") throw invalidRuntime();

  return Object.freeze({
    kind: "ready",
    contextKey,
    createTask: (input: CreateTaskInput) => Reflect.apply(create, creationService, [accountKey, input]),
  });
}

function isObject(value: unknown): value is object {
  return readBoundary(() => typeof value === "object" && value !== null && !Array.isArray(value));
}

function isOpaqueContextKey(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

function isSafeAccountKey(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value !== value.trim()) return false;

  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit <= 0x1f || (codeUnit >= 0x7f && codeUnit <= 0x9f)) return false;
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const nextCodeUnit = value.charCodeAt(index + 1);
      if (!(nextCodeUnit >= 0xdc00 && nextCodeUnit <= 0xdfff)) return false;
      index += 1;
    } else if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      return false;
    }
  }

  return !Array.from(value).some((character) => /\p{Cf}/u.test(character));
}

function invalidRuntime(): ProtocolError {
  return new ProtocolError(INVALID_RUNTIME_MESSAGE);
}

function readBoundary<Value>(read: () => Value): Value {
  try {
    return read();
  } catch {
    throw invalidRuntime();
  }
}
