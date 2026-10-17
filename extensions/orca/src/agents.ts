import { Color, Icon } from "@raycast/api";

/**
 * Every agent Orca can launch, with how it is shown in this extension.
 *
 * Raycast ships no vendor logos and Orca bundles art for only two of these, so
 * each agent gets a distinct built-in icon plus a colour instead. A Quicklink's
 * icon is typed as `Icon`, which rules out custom images there anyway.
 */
export type AgentInfo = {
  id: string;
  title: string;
  color: Color;
  icon: Icon;
};

export const AGENTS: AgentInfo[] = [
  { id: "claude", title: "Claude", color: Color.Orange, icon: Icon.Stars },
  { id: "codex", title: "Codex", color: Color.Blue, icon: Icon.Code },
  { id: "gemini", title: "Gemini", color: Color.Purple, icon: Icon.Snowflake },
  {
    id: "antigravity",
    title: "Antigravity",
    color: Color.Blue,
    icon: Icon.Rocket,
  },
  { id: "amp", title: "Amp", color: Color.Yellow, icon: Icon.Bolt },
  {
    id: "opencode",
    title: "Opencode",
    color: Color.Green,
    icon: Icon.CodeBlock,
  },
  { id: "cursor", title: "Cursor", color: Color.Purple, icon: Icon.TextCursor },
  {
    id: "copilot",
    title: "Copilot",
    color: Color.SecondaryText,
    icon: Icon.Airplane,
  },
  { id: "droid", title: "Droid", color: Color.Green, icon: Icon.ComputerChip },
  { id: "grok", title: "Grok", color: Color.Red, icon: Icon.Crown },
  { id: "kimi", title: "Kimi", color: Color.Magenta, icon: Icon.Moon },
  { id: "devin", title: "Devin", color: Color.Blue, icon: Icon.Hammer },
  { id: "hermes", title: "Hermes", color: Color.Yellow, icon: Icon.Bird },
  { id: "pi", title: "Pi", color: Color.Magenta, icon: Icon.Crypto },
  { id: "omp", title: "OMP", color: Color.Green, icon: Icon.Leaf },
  {
    id: "prime-agent",
    title: "Prime Agent",
    color: Color.Red,
    icon: Icon.Star,
  },
  {
    id: "mimo-code",
    title: "Mimo Code",
    color: Color.Orange,
    icon: Icon.Brush,
  },
  {
    id: "command-code",
    title: "Command Code",
    color: Color.Blue,
    icon: Icon.Terminal,
  },
];

const BY_ID = new Map(AGENTS.map((agent) => [agent.id, agent]));

/** Falls back to a neutral entry: Orca may learn agents this list has not. */
export function agentInfo(id?: string): AgentInfo {
  return (
    (id ? BY_ID.get(id) : undefined) ?? {
      id: id ?? "shell",
      title: id ?? "Shell",
      color: Color.SecondaryText,
      icon: Icon.Terminal,
    }
  );
}
