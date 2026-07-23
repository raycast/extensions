import { runHerdrJson } from "./herdr";
import type { AgentDestination } from "./agent-destination";
import type { HerdrSnapshot, PaneInfo } from "./types";

export type { AgentDestination } from "./agent-destination";

interface TopologyOptions {
  name: string;
  cwd?: string;
  environment: string[];
}

export async function prepareAgentPane(
  destination: AgentDestination,
  snapshot: HerdrSnapshot,
  options: TopologyOptions,
): Promise<string> {
  if (destination.startsWith("pane:")) return destination.slice(5);

  const args: string[] = [];
  if (destination === "new-workspace") {
    args.push("workspace", "create", "--label", options.name);
  } else if (destination.startsWith("tab:")) {
    args.push("tab", "create", "--workspace", destination.slice(4), "--label", options.name);
  } else {
    if (!snapshot.focused_pane_id) throw new Error("No focused pane is available to split.");
    args.push(
      "pane",
      "split",
      snapshot.focused_pane_id,
      "--direction",
      destination === "split-right" ? "right" : "down",
      "--ratio",
      "0.5",
    );
  }

  if (options.cwd) args.push("--cwd", options.cwd);
  for (const value of options.environment) args.push("--env", value);
  args.push("--no-focus");
  const result = await runHerdrJson<{ root_pane?: PaneInfo; pane?: PaneInfo }>(args);
  const pane = result.root_pane ?? result.pane;
  if (!pane) throw new Error("Herdr created the destination but did not return its pane.");
  return pane.pane_id;
}
