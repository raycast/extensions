import { Color, Icon } from "@raycast/api";
import { Agent, SourceType, UpdateStatus } from "./types";

export function sourceIcon(source: SourceType): Icon {
  switch (source) {
    case "git":
      return Icon.Code;
    case "skillssh":
      return Icon.Store;
    case "local":
      return Icon.HardDrive;
    case "import":
      return Icon.Download;
    default:
      return Icon.Document;
  }
}

export function sourceLabel(source: SourceType): string {
  switch (source) {
    case "git":
      return "Git";
    case "skillssh":
      return "skills.sh";
    case "local":
      return "Local";
    case "import":
      return "Imported";
    default:
      return source;
  }
}

export function updateStatusPresentation(status: UpdateStatus): { label: string; icon: Icon; color: Color } {
  switch (status) {
    case "update_available":
      return { label: "Update available", icon: Icon.ArrowClockwise, color: Color.Orange };
    case "up_to_date":
      return { label: "Up to date", icon: Icon.CheckCircle, color: Color.Green };
    case "local_only":
      return { label: "No upstream", icon: Icon.HardDrive, color: Color.SecondaryText };
    case "error":
      return { label: "Check failed", icon: Icon.XMarkCircle, color: Color.Red };
    default:
      return { label: status, icon: Icon.QuestionMarkCircle, color: Color.SecondaryText };
  }
}

/** 4341 → "4.3k". The marketplace's popularity proxy, so keep it glanceable. */
export function formatInstalls(installs: number): string {
  if (installs >= 1_000_000) return `${(installs / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (installs >= 1_000) return `${(installs / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(installs);
}

/** Under 100 installs is worth a look at the source repo before trusting it. */
export const LOW_INSTALL_THRESHOLD = 100;

export function tildePath(absolute: string, home = process.env.HOME ?? ""): string {
  return home && absolute.startsWith(home) ? `~${absolute.slice(home.length)}` : absolute;
}

/**
 * The agents a deploy should offer, in the order a person thinks about them.
 *
 * Skills Manager knows 50+ agents, most of which are not on this machine, so
 * listing them all would bury the three the user actually uses. `installed` and
 * `enabled` are independent flags: an agent defaults to enabled long before it
 * is detected, so "ready" means both.
 *
 * `ready` is what an explicit `--agent` deploy accepts. It is deliberately wider
 * than `coding`: the CLI only applies its category rule when no agent is named,
 * so naming a non-coding agent works and should stay offered.
 */
export function deployTargets(agents: Agent[]): { ready: Agent[]; disabled: Agent[] } {
  const installed = agents.filter((agent) => agent.installed);
  return {
    ready: installed.filter((agent) => agent.enabled),
    disabled: installed.filter((agent) => !agent.enabled),
  };
}

/**
 * The set a no-`--agent` `presets deploy` actually writes to.
 *
 * Upstream filters `installed && enabled && category == Coding`, so this is
 * narrower than `ready`. Anything describing or counting the default deploy
 * must use this, or the UI promises agents the CLI will skip.
 */
export function codingTargets(agents: Agent[]): Agent[] {
  return deployTargets(agents).ready.filter((agent) => agent.category === "coding");
}

export function agentName(agents: Agent[] | undefined, key: string): string {
  return agents?.find((agent) => agent.key === key)?.display_name ?? key;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
