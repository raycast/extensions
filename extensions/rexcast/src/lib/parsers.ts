import type { Session, Win } from "./types";

type RawWindow = { window_id: string; label: string; layers?: { blocks?: Win["blocks"] }[] };

export const parseSessions = (json: string): Session[] => JSON.parse(json).sessions ?? [];

export function parseSession(json: string): { active: string; windows: Win[] } {
  const s = JSON.parse(json);
  return {
    active: s.active_window_id,
    windows: ((s.windows ?? []) as RawWindow[]).map((w) => ({
      window_id: w.window_id,
      label: w.label,
      blocks: (w.layers ?? []).flatMap((l) => l.blocks ?? []),
    })),
  };
}
