import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

const PHI_CLIENT_CONTEXT_SCHEMA_VERSION = 1;
const PHI_CLIENT_ID = "raycast";

export interface PhiInvocationContext {
  schemaVersion: typeof PHI_CLIENT_CONTEXT_SCHEMA_VERSION;
  clientId: typeof PHI_CLIENT_ID;
  clientCommand: string;
  clientAction?: string;
  invocationId: string;
}

interface PhiInvocationSource {
  clientCommand: string;
  clientAction?: string;
}

const invocationStorage = new AsyncLocalStorage<PhiInvocationContext>();

function makeInvocationContext(
  source: PhiInvocationSource,
): PhiInvocationContext {
  return {
    schemaVersion: PHI_CLIENT_CONTEXT_SCHEMA_VERSION,
    clientId: PHI_CLIENT_ID,
    clientCommand: source.clientCommand,
    ...(source.clientAction ? { clientAction: source.clientAction } : {}),
    invocationId: randomUUID(),
  };
}

export function runWithPhiInvocation<Result>(
  source: PhiInvocationSource,
  operation: () => Promise<Result> | Result,
): Promise<Result> | Result {
  return invocationStorage.run(makeInvocationContext(source), operation);
}

export function currentPhiInvocationContext(): PhiInvocationContext {
  return (
    invocationStorage.getStore() ??
    makeInvocationContext({ clientCommand: "unknown" })
  );
}

export function serializePhiInvocationContext(): string {
  return JSON.stringify(currentPhiInvocationContext());
}
