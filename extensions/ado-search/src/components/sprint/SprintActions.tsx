import { Action, ActionPanel, Icon } from "@raycast/api";
import { toWorkItem, workItemUrl } from "../../lib/sprint-api";
import { SprintItem } from "../../lib/sprint-types";
import { ChangeStateView, WorkItemView } from "../work-item-view";
import { ExtraActionSections, sc } from "./ExtraActions";

interface Props {
  item: SprintItem;
  onDone: () => void;
  /** Extra actions (for example list view options) shown in their own section at the end. */
  extra?: React.ReactNode;
}

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
      <ActionPanel.Section title="Copy">
        <Action.CopyToClipboard title="Copy Id" content={String(item.id)} shortcut={sc(".")} />
        <Action.CopyToClipboard title="Copy Title" content={item.title} shortcut={sc(".", ["shift"])} />
        <Action.CopyToClipboard title="Copy URL" content={url} shortcut={sc(",", ["shift"])} />
        <Action.CopyToClipboard
          title="Copy as Markdown Link"
          content={`[#${item.id} ${item.title}](${url})`}
          shortcut={sc(".", ["opt"])}
        />
      </ActionPanel.Section>
      <ExtraActionSections item={item} type={item.type} tracksHours={item.tracksHours} onDone={onDone} />
      {extra}
    </ActionPanel>
  );
}
