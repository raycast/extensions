import { applyOperation, continuityMessage } from "../lib/control";
import { hud, matchDisplay, pauseLabel, toolDisplays } from "../lib/displays";
import { status } from "../lib/helper";
import type { Operation } from "../lib/intent";
import { MAX, OFF } from "../lib/levels";
import { log } from "../lib/log";

type Input = {
  /**
   * The boost level: a position from 1.0 (off) to 1.75 (Max). Presets: 1.1875 Low, 1.375 Medium,
   * 1.5625 High, 1.75 Max; any value in between is allowed (50% of the way to Max is 1.375). It is not a
   * brightness multiplier: how much brighter a level looks depends on the display and its brightness setting.
   */
  level: number;
  /**
   * Optional: one display to change, by the `id` or `name` get-boost lists (e.g. "Pro Display XDR").
   * Use the id when two displays share a name. Leave it out to change every XDR display.
   */
  display?: string;
};

export default async function tool(input: Input) {
  log("tool set-boost", { input });
  const { level } = input;
  if (typeof level !== "number" || !Number.isFinite(level)) {
    throw new Error("level must be a number from 1.0 (off) to 1.75 (maximum).");
  }
  if (level < OFF || level > MAX) {
    throw new Error(`level ${level} is out of range: use 1.0 (off) to 1.75 (maximum).`);
  }
  const name = input.display?.trim(); // models send "" for an optional string: treat it as absent
  const op: Operation = name
    ? { kind: "displays", levels: { [matchDisplay((await status()).displays, name).uuid]: level } }
    : { kind: "all", level };
  const applied = await applyOperation(op, { refreshMenuBar: true });
  const { after } = applied;
  const paused = pauseLabel(after);
  const warning = continuityMessage(applied);
  return {
    summary: hud(after),
    ...(paused ? { paused } : {}),
    ...(warning ? { warning } : {}),
    displays: toolDisplays(after.displays),
  };
}
