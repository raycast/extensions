import { Cache } from "@raycast/api";
import { useEffect, useState } from "react";
import { observeCommands, type CommandEvent } from "../mise/exec";
import { resolveMise, type MiseLocation, type MiseNotFound } from "../mise/locate";
import { readPreferences } from "./preferences";

export type MiseFound = { status: "found"; location: MiseLocation };
export type MiseMissing = { status: "missing"; searched: string[] };
export type MiseState = { status: "loading" } | MiseFound | MiseMissing;

const cache = new Cache({ namespace: "mise" });
const storage = { get: (key: string) => cache.get(key), set: (key: string, value: string) => cache.set(key, value) };

function logCommand({ args, code, ms }: CommandEvent) {
  console.log(`mise ${args.join(" ")} → exit ${code ?? "signal"} in ${ms}ms`);
}

export function resolveMiseFromRaycast(): Promise<MiseLocation | MiseNotFound> {
  const { misePath, debugLogging } = readPreferences();
  observeCommands(debugLogging ? logCommand : undefined);
  return resolveMise({ preferredPath: misePath, storage });
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
