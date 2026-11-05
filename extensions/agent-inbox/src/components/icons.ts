import { Color, Icon, Image } from "@raycast/api";
import { Session } from "../core/types";

const LOGOS: Record<string, string> = { claude: "claude.svg", codex: "openai.svg" };
const BRAND: Record<string, Color.ColorLike> = { claude: "#D97757", codex: Color.PrimaryText };

/**
 * Real agent logos. Subscribed sessions use the full logo, unsubscribed ones are dimmed —
 * subscription is told apart by brightness, not by an extra badge.
 */
export function agentIcon(agent: string, dimmed = false): Image.ImageLike {
  const source = LOGOS[agent];
  if (!source) return { source: Icon.Terminal, tintColor: dimmed ? Color.SecondaryText : Color.PrimaryText };
  return { source, tintColor: dimmed ? Color.SecondaryText : (BRAND[agent] ?? Color.PrimaryText) };
}

/** Status light: running = blue, waiting = orange, done = none. */
export function statusDot(s: Pick<Session, "status">): Image.ImageLike | undefined {
  if (s.status === "running") return { source: Icon.CircleFilled, tintColor: Color.Blue };
  if (s.status === "needs_input") return { source: Icon.CircleFilled, tintColor: Color.Orange };
  return undefined;
}
