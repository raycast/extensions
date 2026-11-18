import { createHash } from "node:crypto";
import { mkdir, mkdtemp } from "node:fs/promises";
import path from "node:path";
import type { SessionContext } from "./sessions";

export const RETAINED_ENVIRONMENT_PREFIX = "retained-browser-environment:";

type SessionStorage = {
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

function retainedKey(context: SessionContext): string {
  const fingerprint = createHash("sha256")
    .update(JSON.stringify([context.fakeHome, context.socketDirectory]))
    .digest("hex");
  return `${RETAINED_ENVIRONMENT_PREFIX}${fingerprint}`;
}

/** The binding and its files have different lifetimes when other daemons share a bridge. */
export async function removeSessionBinding(
  bindingKey: string,
  context: SessionContext | undefined,
  preserveFiles: boolean,
  storage: SessionStorage,
  removeFiles: () => Promise<void>,
): Promise<void> {
  if (context?.fakeHome) {
    // Record resources before freeing the name, including when subsequent file cleanup fails.
    await storage.setItem(
      retainedKey(context),
      JSON.stringify({
        backend: "agent-browser",
        fakeHome: context.fakeHome,
        socketDirectory: context.socketDirectory,
        applicationName: context.applicationName,
        profile: context.profile,
      }),
    );
  }
  await storage.removeItem(bindingKey);
  if (context?.fakeHome && !preserveFiles) {
    await removeFiles();
    await storage.removeItem(retainedKey(context));
  }
}

export function readRetainedEnvironments(items: Record<string, unknown>): SessionContext[] {
  return Object.entries(items).flatMap(([key, value]) => {
    if (!key.startsWith(RETAINED_ENVIRONMENT_PREFIX) || typeof value !== "string") return [];
    try {
      const context = JSON.parse(value) as SessionContext | null;
      if (
        !context ||
        typeof context !== "object" ||
        typeof context.fakeHome !== "string" ||
        (context.socketDirectory !== undefined && typeof context.socketDirectory !== "string")
      )
        return [];
      return [context];
    } catch {
      return [];
    }
  });
}

/** A reused name must not adopt or later remove a bridge retained for an older session's peers. */
export async function createProfileBridgeHome(root: string, session: string, fingerprint: string): Promise<string> {
  const parent = path.join(root, session);
  await mkdir(parent, { recursive: true });
  return mkdtemp(path.join(parent, `${fingerprint}-`));
}
