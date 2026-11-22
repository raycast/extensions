import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
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
      <Action.CopyToClipboard
        content={name}
        title={strings.copyBounceName}
        icon={Icon.CopyClipboard}
        shortcut={Keyboard.Shortcut.Common.CopyName}
      />
      <Action.CopyToClipboard
        content={path}
        title={strings.copyBouncePath}
        icon={Icon.CopyClipboard}
        shortcut={Keyboard.Shortcut.Common.CopyPath}
      />
    </ActionPanel.Section>
  );
}
