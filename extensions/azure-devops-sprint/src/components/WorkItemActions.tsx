import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import { workItemUrl } from "../api";
import { WorkItem } from "../types";
import { CopyContent } from "./CopyContent";
import { RelatedView } from "./RelatedView";
import { ChangeStateForm, CommentForm, LogHoursForm, MoveSprintForm } from "./forms";

interface Props {
  item: WorkItem;
  onDone: () => void;
  /** Pass a detail view to show an "Open Details" action first. */
  detail?: React.ReactNode;
  /** Extra actions (for example list view options) shown in their own section at the end. */
  extra?: React.ReactNode;
}

/** `cmd` is mapped to Ctrl by Raycast on Windows, so these work on both platforms. */
type Key = Keyboard.KeyEquivalent;
type Mod = "shift" | "opt";
const sc = (key: Key, extra: Mod[] = []): Keyboard.Shortcut => ({
  macOS: { modifiers: ["cmd", ...extra], key },
  Windows: { modifiers: ["ctrl", ...extra], key },
});

export function WorkItemActions({ item, onDone, detail, extra }: Props) {
  return (
    <ActionPanel>
      {detail && (
        <ActionPanel.Section>
          <Action.Push title="Open Details" icon={Icon.Sidebar} target={detail} />
        </ActionPanel.Section>
      )}
      <ActionPanel.Section title="Update">
        <Action.Push
          title="Change Status…"
          icon={Icon.ArrowRightCircle}
          shortcut={Keyboard.Shortcut.Common.Save}
          target={<ChangeStateForm item={item} onDone={onDone} />}
        />
        <Action.Push
          title="Add Comment…"
          icon={Icon.Bubble}
          shortcut={sc("m")}
          target={<CommentForm item={item} onDone={onDone} />}
        />
        <Action.Push
          title="Log Hours…"
          icon={Icon.Clock}
          shortcut={sc("h")}
          target={<LogHoursForm item={item} onDone={onDone} />}
        />
        <Action.Push
          title="Move to Sprint…"
          icon={Icon.Calendar}
          shortcut={sc("i")}
          target={<MoveSprintForm item={item} onDone={onDone} />}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Links">
        <Action.Push
          title="Show Related Items, PRs and Commits"
          icon={Icon.Link}
          shortcut={sc("l")}
          target={<RelatedView item={item} onChange={onDone} />}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Open and Copy">
        <Action.OpenInBrowser
          title="Open in Azure DevOps"
          url={workItemUrl(item.id)}
          shortcut={Keyboard.Shortcut.Common.Open}
        />
        <Action.CopyToClipboard
          title="Copy Link"
          content={workItemUrl(item.id)}
          shortcut={Keyboard.Shortcut.Common.Copy}
        />
        <Action.CopyToClipboard title="Copy Number" content={String(item.id)} shortcut={sc("n", ["shift"])} />
        <Action.CopyToClipboard
          title="Copy ID and Title"
          content={`| ${item.id} | ${item.title}`}
          shortcut={sc("t", ["shift"])}
        />
        <Action.Push
          title="Copy Description or Comments…"
          icon={Icon.CopyClipboard}
          shortcut={sc("d", ["shift"])}
          target={<CopyContent item={item} />}
        />
      </ActionPanel.Section>
      {extra}
    </ActionPanel>
  );
}
