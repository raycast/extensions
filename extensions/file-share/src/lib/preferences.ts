import { getPreferenceValues } from "@raycast/api";
import os from "node:os";
import path from "node:path";
import { CONTROL_PORT, DEFAULT_PORT, PORT_RANGE } from "./types";

type RawPreferences = {
  port?: string;
  receiveDirectory?: string;
};

export type ResolvedPreferences = {
  port: number;
  /** Set when the configured port is unusable, so the panel can say why the fallback was used. */
  portProblem?: string;
  portIsCustom: boolean;
  receiveDirectory: string;
};

/** Same landing spot as the reference implementation: what a browser uploads lands in Downloads. */
export const DEFAULT_RECEIVE_DIRECTORY = "~/Downloads";

export function expandHome(input: string): string {
  const trimmed = input.trim();
  if (trimmed === "~") return os.homedir();
  if (trimmed.startsWith("~/"))
    return path.join(os.homedir(), trimmed.slice(2));
  return trimmed;
}

export function resolvePreferences(): ResolvedPreferences {
  const raw = getPreferenceValues<RawPreferences>();

  let port = DEFAULT_PORT;
  let portProblem: string | undefined;
  const rawPort = (raw.port ?? "").trim();
  if (rawPort !== "") {
    const parsed = Number(rawPort);
    if (
      !Number.isInteger(parsed) ||
      parsed < PORT_RANGE.min ||
      parsed > PORT_RANGE.max
    ) {
      portProblem = `"${rawPort}" is not an integer between ${PORT_RANGE.min} and ${PORT_RANGE.max}. Using ${DEFAULT_PORT} instead.`;
    } else if (parsed === CONTROL_PORT) {
      portProblem = `${CONTROL_PORT} is reserved for the local control channel. Using ${DEFAULT_PORT} instead.`;
    } else {
      port = parsed;
    }
  }

  const receiveDirectory =
    expandHome(raw.receiveDirectory ?? "") ||
    expandHome(DEFAULT_RECEIVE_DIRECTORY);

  return {
    port,
    portProblem,
    portIsCustom: port !== DEFAULT_PORT,
    receiveDirectory,
  };
}
