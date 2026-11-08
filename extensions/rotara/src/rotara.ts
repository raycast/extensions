import { execSync } from "node:child_process";
import { open, Color } from "@raycast/api";

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

/** Parses the base64 `sessionV1` blob. Read-only; returns null if unusable. */
export function parseSession(base64: string): Session | null {
  const json = JSON.parse(Buffer.from(base64.trim(), "base64").toString("utf8"));
  if (!Array.isArray(json.workspaces) || json.workspaces.length === 0) return null;
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

/** Reads Rotara's saved workspaces from its defaults domain. Null if unavailable. */
export function readSession(): Session | null {
  try {
    const b64 = execSync(`defaults export com.rotara.app - | plutil -extract sessionV1 raw -o - -`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return parseSession(b64);
  } catch {
    return null;
  }
}

export const ROTARA_SITE = "https://getrotara.app";

const url = (action: string, name: string, extra = "") => `rotara://${action}?name=${encodeURIComponent(name)}${extra}`;

export const switchTo = (name: string) => open(url("switch", name));
export const createWorkspace = (name: string) => open(url("new", name));
export const moveWindow = (name: string, follow: boolean) => open(url("move", name, `&follow=${follow ? 1 : 0}`));
