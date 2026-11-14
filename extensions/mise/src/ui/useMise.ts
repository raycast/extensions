import { Cache } from "@raycast/api";
import { useEffect, useState } from "react";
import { observeCommands, type CommandEvent } from "../mise/exec";
import { resolveMise, type MiseLocation, type MiseNotFound } from "../mise/locate";
import { readVersion } from "../mise/version";
import { readPreferences } from "./preferences";

export type MiseFound = { status: "found"; location: MiseLocation };
export type MiseMissing = { status: "missing"; searched: string[] };
export type MiseState = { status: "loading" } | MiseFound | MiseMissing;

const cache = new Cache({ namespace: "mise" });
const storage = { get: (key: string) => cache.get(key), set: (key: string, value: string) => cache.set(key, value) };

function logCommand({ args, code, ms }: CommandEvent) {
  console.log(`mise ${args.join(" ")} → exit ${code ?? "signal"} in ${ms}ms`);
}

// The version is read on every launch rather than cached: mise can be upgraded in place at the same
// path, and `mise version` costs a few milliseconds because mise caches its own latest-release check.
export async function resolveMiseFromRaycast(): Promise<MiseLocation | MiseNotFound> {
  const { misePath, debugLogging } = readPreferences();
  observeCommands(debugLogging ? logCommand : undefined);
  const result = await resolveMise({ preferredPath: misePath, storage });
  return "path" in result ? { ...result, version: await readVersion(result) } : result;
}

export function useMise(): MiseState {
  const [state, setState] = useState<MiseState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    resolveMiseFromRaycast().then((result) => {
      if (cancelled) return;
      setState(
        "path" in result ? { status: "found", location: result } : { status: "missing", searched: result.searched },
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
