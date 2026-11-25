import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import { toWorkItem, workItemUrl } from "../../lib/sprint-api";
import { SprintItem } from "../../lib/sprint-types";
import { ChangeStateView, WorkItemView } from "../work-item-view";
import { CopyContent } from "./CopyContent";
import { RelatedView } from "./RelatedView";
import { CommentForm, LogHoursForm, MoveSprintForm } from "./forms";

interface Props {
  item: SprintItem;
  onDone: () => void;
  /** Extra actions (for example list view options) shown in their own section at the end. */
  extra?: React.ReactNode;
}

type Mod = "shift" | "opt";
/** Same key on both platforms: Cmd on macOS, Ctrl on Windows. */
const sc = (key: Keyboard.KeyEquivalent, extra: Mod[] = []): Keyboard.Shortcut => ({
  macOS: { modifiers: ["cmd", ...extra], key },
  Windows: { modifiers: ["ctrl", ...(extra.map((m) => (m === "opt" ? "alt" : m)) as ("shift" | "alt")[])], key },
});

/**
 * Actions of a sprint work item. Opening, changing state and the copy shortcuts are the same ones
 * My Work Items uses, so both commands behave alike.
 */
export function SprintActions({ item, onDone, extra }: Props) {
  const wi = toWorkItem(item);
  const url = workItemUrl(item.id);
  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.Push title="Open" icon={Icon.ArrowRight} target={<WorkItemView item={wi} onUpdated={onDone} />} />
        <Action.Push
          title="Change State"
          icon={Icon.Pencil}
          shortcut={sc("s", ["shift"])}
          target={<ChangeStateView item={wi} onUpdated={onDone} />}
        />
        <Action.OpenInBrowser title="Open in Azure Devops" url={url} shortcut={sc("o")} />
      </ActionPanel.Section>
      <ActionPanel.Section title="Update">
        <Action.Push
          title="Add Comment…"
          icon={Icon.Bubble}
          shortcut={sc("m")}
          target={<CommentForm item={item} onDone={onDone} />}
        />
        {item.tracksHours && (
          <Action.Push
            title="Log Hours…"
            icon={Icon.Clock}
            shortcut={sc("h")}
            target={<LogHoursForm item={item} onDone={onDone} />}
          />
        )}
        <Action.Push
          title="Move to Sprint…"
          icon={Icon.Calendar}
          shortcut={sc("i")}
          target={<MoveSprintForm item={item} onDone={onDone} />}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Links">
        <Action.Push
          title="Show Related Items, Pull Requests and Commits"
          icon={Icon.Link}
          shortcut={sc("l")}
          target={<RelatedView item={item} onChange={onDone} />}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Copy">
        <Action.CopyToClipboard title="Copy Id" content={String(item.id)} shortcut={sc(".")} />
        <Action.CopyToClipboard title="Copy Title" content={item.title} shortcut={sc(".", ["shift"])} />
        <Action.CopyToClipboard title="Copy URL" content={url} shortcut={sc(",", ["shift"])} />
        <Action.CopyToClipboard
          title="Copy as Markdown Link"
          content={`[#${item.id} ${item.title}](${url})`}
          shortcut={sc(".", ["opt"])}
        />
        <Action.CopyToClipboard
          title="Copy Id and Title"
          content={`| ${item.id} | ${item.title}`}
          shortcut={sc("t", ["shift"])}
        />
        <Action.Push
          title="Copy Description or Comments…"
          icon={Icon.CopyClipboard}
          shortcut={sc("d", ["opt"])}
          target={<CopyContent item={item} />}
        />
      </ActionPanel.Section>
      {extra}
    </ActionPanel>
  );
}
