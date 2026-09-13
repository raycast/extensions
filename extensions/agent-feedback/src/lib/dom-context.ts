import { environment } from "@raycast/api";
import { randomBytes } from "crypto";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { isSameProcess, spawnDetached } from "./process";
import {
  DomContextBridgeState,
  DomContextTarget,
  RecordingState,
} from "./types";

const DOM_CONTEXT_PORT = 43127;

interface DomContextClear {
  kind: "clear";
  timestampMs: number;
}

interface DomContextStatus {
  connectedAt?: string;
}

type DomContextEvent = DomContextTarget | DomContextClear;

export interface DomContextTimeline {
  connected: boolean;
  at(timestampMs: number): DomContextTarget | undefined;
}

export async function startDomContextBridge(
  sessionDir: string,
  recorderPid: number,
): Promise<DomContextBridgeState | undefined> {
  const eventsPath = join(sessionDir, "dom-context.jsonl");
  const statusPath = join(sessionDir, "dom-context-status.json");
  const token = randomBytes(24).toString("hex");
  let bridgeProcess;
  try {
    bridgeProcess = await spawnDetached(
      process.execPath,
      [
        join(environment.assetsPath, "dom-bridge-server.js"),
        String(DOM_CONTEXT_PORT),
        eventsPath,
        statusPath,
        join(environment.assetsPath, "dom-context.js"),
        token,
        String(recorderPid),
      ],
      join(sessionDir, "dom-context.log"),
    );
  } catch {
    return undefined;
  }

  await new Promise((resolve) => setTimeout(resolve, 250));
  if (!isSameProcess(bridgeProcess)) return undefined;
  return {
    process: bridgeProcess,
    port: DOM_CONTEXT_PORT,
    eventsPath,
    statusPath,
  };
}

export function stopDomContextBridge(
  bridge: DomContextBridgeState | undefined,
): void {
  if (!bridge || !isSameProcess(bridge.process)) return;
  try {
    process.kill(bridge.process.pid, "SIGTERM");
  } catch {
    // DOM context is optional and must never prevent the recording from ending.
  }
}

function readEvents(path: string): DomContextEvent[] {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8")
    .split("\n")
    .filter(Boolean)
    .flatMap((line) => {
      try {
        const event = JSON.parse(line) as DomContextEvent;
        return event &&
          (event.kind === "hover" || event.kind === "clear") &&
          Number.isFinite(event.timestampMs)
          ? [event]
          : [];
      } catch {
        return [];
      }
    })
    .sort((a, b) => a.timestampMs - b.timestampMs);
}

function wasConnected(path: string): boolean {
  if (!existsSync(path)) return false;
  try {
    return Boolean(
      (JSON.parse(readFileSync(path, "utf8")) as DomContextStatus).connectedAt,
    );
  } catch {
    return false;
  }
}

export function loadDomContextTimeline(
  state: RecordingState,
): DomContextTimeline {
  const bridge = state.domContext;
  if (!bridge) return { connected: false, at: () => undefined };
  const events = readEvents(bridge.eventsPath);
  const recordingStartedAt = Date.parse(state.startedAt);

  return {
    connected: events.length > 0 || wasConnected(bridge.statusPath),
    at(timestampMs: number) {
      const absoluteTimestamp = recordingStartedAt + timestampMs;
      let target: DomContextTarget | undefined;
      for (const event of events) {
        if (event.timestampMs > absoluteTimestamp) break;
        target = event.kind === "hover" ? event : undefined;
      }
      return target;
    },
  };
}
