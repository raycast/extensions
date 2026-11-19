import { exec } from "node:child_process";
import { promisify } from "node:util";
import { open, Color } from "@raycast/api";

const run = promisify(exec);

export interface Workspace {
  id: string;
  name: string;
  number: number; // 1-based position = Ctrl+N
  colorIndex: number;
  color: Color.ColorLike;
}

export interface Session {
  workspaces: Workspace[];
  activeID: string;
}

const COLORS: Color.ColorLike[] = [
  Color.Blue,
  Color.Orange,
  Color.Green,
  Color.Purple,
  Color.Magenta,
  "#30B0C7", // teal (no Raycast equivalent)
  Color.Yellow,
  "#5856D6", // indigo
];

const colorFor = (index: number): Color.ColorLike => COLORS[index] ?? Color.SecondaryText;

/** Parses the base64 `sessionV1` blob. Throws if it's damaged (Rotara always saves at least Main). */
export function parseSession(base64: string): Session {
  const json = JSON.parse(Buffer.from(base64.trim(), "base64").toString("utf8"));
  if (!Array.isArray(json.workspaces) || json.workspaces.length === 0)
    throw new Error("Rotara's saved workspaces are unreadable.");
  const workspaces: Workspace[] = json.workspaces.map(
    (w: { id: string; name: string; colorIndex: number }, i: number) => ({
      id: w.id,
      name: w.name,
      number: i + 1,
      colorIndex: w.colorIndex,
      color: colorFor(w.colorIndex),
    }),
  );
  return { workspaces, activeID: json.activeID };
}

/**
 * Reads Rotara's saved workspaces from its defaults domain (read-only).
 * Null when there are none saved (Rotara not installed or never run); throws when they can't be read.
 */
export async function readSession(): Promise<Session | null> {
  try {
    await run(`/usr/bin/defaults read com.rotara.app sessionV1`);
  } catch (e) {
    // "Domain … not found" (never run here) or "Could not find key" (nothing saved yet): no data, not a failure.
    if (/not found|Could not find|does not exist/.test(String((e as { stderr?: string }).stderr ?? ""))) return null;
    throw e;
  }
  const { stdout } = await run(
    `/usr/bin/defaults export com.rotara.app - | /usr/bin/plutil -extract sessionV1 raw -o - -`,
  );
  return parseSession(stdout);
}

export const ROTARA_SITE = "https://getrotara.app";

const url = (action: string, name: string, extra = "") => `rotara://${action}?name=${encodeURIComponent(name)}${extra}`;

export const switchTo = (name: string) => open(url("switch", name));
export const createWorkspace = (name: string) => open(url("new", name));
export const moveWindow = (name: string, follow: boolean) => open(url("move", name, `&follow=${follow ? 1 : 0}`));
