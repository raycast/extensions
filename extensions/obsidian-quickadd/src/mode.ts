import { ObsidianRegistry } from "./cli";

export type BasicReason = "no-cli" | "cli-disabled" | "quickadd-old";

export const REASON_TEXT: Record<BasicReason, string> = {
  "no-cli": "Update Obsidian to 1.12 or later for full QuickAdd support.",
  "cli-disabled": "Turn on Settings → General → Advanced → Command line interface in Obsidian, then restart Obsidian.",
  "quickadd-old": "QuickAdd isn't enabled in this vault, or is older than 2.27.",
};

export type Mode = { mode: "full"; cli: string } | { mode: "basic"; reason: BasicReason };

export function detectMode(cli: string | undefined, registry: ObsidianRegistry): Mode {
  if (!cli) return { mode: "basic", reason: "no-cli" };
  if (!registry.cli) return { mode: "basic", reason: "cli-disabled" };
  return { mode: "full", cli };
}

export function isBasicReason(reason: string): reason is BasicReason {
  return reason in REASON_TEXT;
}
