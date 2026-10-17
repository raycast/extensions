import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import type { Memo } from "../api/memo";
import { memoUrl } from "../helpers/instanceUrl";
import { EditMemoForm } from "./EditMemoForm";

type Props = {
  memo: Memo;
  instanceUrl: string;
  isEditable?: boolean;
  onReload?: () => void;
};

export const MemoActions = ({ memo, instanceUrl, isEditable, onReload }: Props) => {
  const url = memoUrl(instanceUrl, memo.name);
  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.OpenInBrowser title="Open in Memos" url={url} />
        {isEditable ? (
          <Action.Push
            title="Edit Memo"
            icon={Icon.Pencil}
            shortcut={Keyboard.Shortcut.Common.Edit}
            target={<EditMemoForm memo={memo} onSaved={() => onReload?.()} />}
          />
        ) : null}
        <Action.CopyToClipboard title="Copy Content" content={memo.content} shortcut={Keyboard.Shortcut.Common.Copy} />
        <Action.CopyToClipboard
          title="Copy Link"
          content={url}
          shortcut={{
            macOS: { modifiers: ["cmd", "shift"], key: "l" },
            Windows: { modifiers: ["ctrl", "shift"], key: "l" },
          }}
        />
        <Action.Paste title="Paste Content" content={memo.content} />
      </ActionPanel.Section>
      {onReload == null ? null : (
        <ActionPanel.Section>
          <Action
            title="Reload"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={onReload}
          />
        </ActionPanel.Section>
      )}
    </ActionPanel>
  );
};
