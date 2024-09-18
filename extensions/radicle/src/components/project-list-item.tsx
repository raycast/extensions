import type { Project } from "../types";

import { Action, ActionPanel, List, openExtensionPreferences } from "@raycast/api";
import { Project as ProjectComponent } from "../project";

export function ProjectListItem({ project: p }: { project: Project }) {
  return (
    <List.Item
      key={p.id}
      title={p.name}
      subtitle={p.description}
      accessories={[
        { text: p.patches.open.toString(), icon: "patch.svg" },
        { text: p.issues.open.toString(), icon: "issue.svg" },
        { text: `${p.threshold}/${p.delegates.length}`, icon: "quorum.svg" },
        { text: p.seeding.toString(), icon: "seeding.svg" },
      ]}
      actions={<Actions project={p} />}
    />
  );
}

function Actions({ project: p }: { project: Project }) {
  return (
    <ActionPanel title="More Information">
      <Action.Push title="Show Details" target={<ProjectComponent project={p} />} />
      <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
    </ActionPanel>
  );
}
