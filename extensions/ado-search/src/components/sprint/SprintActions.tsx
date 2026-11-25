import { Action, ActionPanel, Icon } from "@raycast/api";
import { isConfiguredProject, toWorkItem, workItemUrl } from "../../lib/sprint-api";
import { SprintItem } from "../../lib/sprint-types";
import { ChangeStateView } from "../work-item-view";
import { SprintItemDetail } from "./SprintItemDetail";
import { isStory } from "../../lib/sprint-utils";
import { ExtraActionSections, sc } from "./ExtraActions";
import { NewTaskForm } from "./NewTaskForm";

interface Props {
  item: SprintItem;
  onDone: () => void;
  /** Extra actions (for example list view options) shown in their own section at the end. */
  extra?: React.ReactNode;
  /** Parent of the item, shown in its detail. */
  parent?: SprintItem;
  /** True inside the item's own detail view: no "Open" action. */
  inDetail?: boolean;
}

/**
 * Actions of a sprint work item. Opening, changing state and the copy shortcuts are the same ones
 * My Work Items uses, so both commands behave alike.
 */
export function SprintActions({ item, onDone, extra, parent, inDetail = false }: Props) {
  const wi = toWorkItem(item);
  const url = workItemUrl(item.id);
  return (
    <ActionPanel>
      <ActionPanel.Section>
        {!inDetail && (
          <Action.Push
            title="Open Details"
            icon={Icon.Sidebar}
            target={<SprintItemDetail item={item} parent={parent} onChange={onDone} />}
          />
        )}
        <Action.Push
          title="Change State"
          icon={Icon.Pencil}
          shortcut={sc("s", ["shift"])}
          target={<ChangeStateView item={wi} onUpdated={onDone} />}
        />
        <Action.OpenInBrowser title="Open in Azure Devops" url={url} shortcut={sc("o")} />
        {item.iterationPath && isConfiguredProject(item.project) && (
          <Action.Push
            title="New Task"
            icon={Icon.Plus}
            shortcut={sc("n")}
            target={
              <NewTaskForm
                iterationPath={item.iterationPath}
                // Under the selected story, or under the same story as the selected task.
                parentId={isStory(item.type) ? item.id : item.sprintParentId}
                onCreated={onDone}
              />
            }
          />
        )}
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
