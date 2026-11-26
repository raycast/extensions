// Deeplink context + "Save as Quicklink" action. Kept free of view imports so any view can use it.

import { hotkey } from "../lib/shortcut";
import { Action, Icon } from "@raycast/api";
import { createDeeplink } from "@raycast/utils";
import { currentProject } from "../lib/raycast";

export interface HierarchyContext {
  project?: string;
  env?: string; // full resource name (a bare environment id is accepted when unambiguous)
  search?: string;
  dag?: string;
  state?: string;
  run?: string;
  task?: string;
  map?: number;
  try?: number;
  filter?: "all" | "failed";
  /** alternate view at the env / DAG / run level */
  view?:
    | "perf"
    | "graph"
    | "tasks"
    | "lineage"
    | "run-lineage"
    | "datasets"
    | "dataset"
    | "performance"
    | "slowest-tasks"
    | "import-errors"
    | "discover"
    | "failures"
    | "environments";
  dataset?: string;
  hours?: number;
  /** lineage graph depth; "full" for the whole graph */
  depth?: number | "full";
}

/** Deeplink into the Composer command at the given level. The project is always included. */
export function hierarchyDeeplink(ctx: HierarchyContext): string {
  const full = { project: ctx.project ?? currentProject(), ...ctx };
  return createDeeplink({ command: "composer", context: { ...full } });
}

/** Save this level (environment, DAG, run, task log, lineage graph...) as a Raycast Quicklink. */
export function SaveQuicklinkAction(props: { context: HierarchyContext; name: string }) {
  return (
    <Action.CreateQuicklink
      title="Save as Quicklink"
      icon={Icon.Link}
      shortcut={hotkey(["cmd", "shift"], "q")}
      quicklink={{ name: props.name, link: hierarchyDeeplink(props.context) }}
    />
  );
}
