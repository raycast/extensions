import { Action, closeMainWindow, Icon, Keyboard } from "@raycast/api";
import { openNewThreadInProject } from "../lib/open-codex";

export default function NewThreadAction({ projectPath }: { projectPath: string }) {
  return (
    <Action
      title="New Thread in Project"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      onAction={async () => {
        if (await openNewThreadInProject(projectPath)) await closeMainWindow();
      }}
    />
  );
}
