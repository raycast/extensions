import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import type { Project } from "@/core/projects/types";
import { copyWithHud } from "@/core/ui/shared/toast";
import { strings } from "@/strings";

// 项目行的复制分区：最新 bounce、项目名、项目路径。各界面共用。
export function CopyProjectSection({
  project,
  onCopyLatestBounce,
}: {
  project: Project;
  onCopyLatestBounce: () => void;
}) {
  return (
    <ActionPanel.Section title={strings.sectionCopy}>
      {project.bouncesCount > 0 && (
        <Action
          title={strings.copyLatestBounce}
          icon={Icon.CopyClipboard}
          shortcut={Keyboard.Shortcut.Common.Copy}
          onAction={onCopyLatestBounce}
        />
      )}
      <Action
        title={strings.copyProjectName}
        icon={Icon.CopyClipboard}
        shortcut={Keyboard.Shortcut.Common.CopyName}
        onAction={() => void copyWithHud(project.title, strings.projectNameCopied)}
      />
      <Action
        title={strings.copyProjectPath}
        icon={Icon.CopyClipboard}
        shortcut={Keyboard.Shortcut.Common.CopyPath}
        onAction={() => void copyWithHud(project.folderPath, strings.projectPathCopied)}
      />
    </ActionPanel.Section>
  );
}
