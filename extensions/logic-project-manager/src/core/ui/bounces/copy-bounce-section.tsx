import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import { copyWithHud } from "@/core/ui/shared/toast";
import { strings } from "@/strings";

// bounce 行的复制分区：文件、文件名、完整路径。各界面共用。
export function CopyBounceSection({ name, path, onCopy }: { name: string; path: string; onCopy: () => void }) {
  return (
    <ActionPanel.Section title={strings.sectionCopy}>
      <Action
        title={strings.copyBounce}
        icon={Icon.CopyClipboard}
        shortcut={Keyboard.Shortcut.Common.Copy}
        onAction={onCopy}
      />
      <Action
        title={strings.copyBounceName}
        icon={Icon.CopyClipboard}
        shortcut={Keyboard.Shortcut.Common.CopyName}
        onAction={() => void copyWithHud(name, strings.bounceNameCopied)}
      />
      <Action
        title={strings.copyBouncePath}
        icon={Icon.CopyClipboard}
        shortcut={Keyboard.Shortcut.Common.CopyPath}
        onAction={() => void copyWithHud(path, strings.bouncePathCopied)}
      />
    </ActionPanel.Section>
  );
}
