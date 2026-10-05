import { getSnapshot, runHerdrJson, HerdrError } from "./herdr";
import type { AgentDestination } from "./agent-destination";
import type { PaneInfo } from "./types";

export type { AgentDestination } from "./agent-destination";

interface TopologyOptions {
  name: string;
  cwd?: string;
  environment: string[];
}

export async function prepareAgentPane(destination: AgentDestination, options: TopologyOptions): Promise<string> {
  if (destination.startsWith("pane:")) return destination.slice(5);

  const args: string[] = [];
  if (destination === "new-workspace") {
    args.push("workspace", "create", "--label", options.name);
  } else if (destination.startsWith("tab:")) {
    args.push("tab", "create", "--workspace", destination.slice(4), "--label", options.name);
  } else {
    const { focused_pane_id: focusedPaneId } = await getSnapshot();
    if (!focusedPaneId) {
      throw new HerdrError("No focused pane is available to split.", "no_focused_pane");
    }
    // Without an explicit target the server splits its own focused pane, which
    // another client may have moved since the user chose this destination.
    args.push("pane", "split", focusedPaneId, "--direction", destination === "split-right" ? "right" : "down");
    args.push("--ratio", "0.5");
  }

  if (options.cwd) args.push("--cwd", options.cwd);
  for (const value of options.environment) args.push("--env", value);
  args.push("--no-focus");
  const result = await runHerdrJson<{ root_pane?: PaneInfo; pane?: PaneInfo }>(args);
  const pane = result.root_pane ?? result.pane;
  if (!pane) {
    throw new HerdrError("Herdr created the destination but did not return its pane.", "pane_not_returned");
  }
  return pane.pane_id;
}
