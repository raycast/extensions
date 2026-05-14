import { useEffect, useState } from "react";
import { List, Icon, Color } from "@raycast/api";
import type { Image } from "@raycast/api";
import type { Command, CommandSuggestions, Comment, EnumValue, Issue, IssueExtended, WorkItem } from "../interfaces";
import { issueStates, getPriorityFieldValue } from "../utils";
import { Actions } from "./Actions";

const resolvedIcon = { source: Icon.Check, tintColor: Color.Green };
const openIcon = { source: Icon.Dot };

export function IssueListItem(props: {
  item: Issue;
  index: number;
  instance: string;
  resolved: boolean;
  getIssueDetailsCb: () => Promise<IssueExtended | void>;
  createWorkItemCb: (workItem: WorkItem) => Promise<WorkItem | void>;
  applyCommandCb: (command: Command) => Promise<void>;
  getCommandSuggestions: (command: string) => Promise<CommandSuggestions>;
  getLastCommentCb: () => Promise<Comment | null>;
  deleteIssueCb: () => Promise<void>;
}) {
  const [state, setState] = useState<{ icon: Image; accessories: List.Item.Accessory[] }>({
    icon: { source: "" },
    accessories: [],
  });

  const priorityFieldValue = getPriorityFieldValue(props.item.customFields);
  const stateField = props.item.customFields.find((field) => field.name === "State");

  useEffect(() => {
    const icon = props.resolved ? resolvedIcon : openIcon;
    const tooltip = props.resolved ? issueStates.ISSUE_RESOLVED : issueStates.ISSUE_OPEN;
    const accessories = priorityFieldValue
      ? [
          {
            tag: {
              value: priorityFieldValue.name[0],
              color: priorityFieldValue.color?.background ?? "",
              tooltip: priorityFieldValue.name,
            },
          },
          { text: props.item.id, tooltip },
        ]
      : [{ text: props.item.id, tooltip }];
    setState({ icon, accessories });
  }, [priorityFieldValue, props.item.id, props.resolved]);

  return (
    <List.Item
      icon={state.icon}
      title={props.item.summary}
      keywords={[props.item.id]}
      subtitle={{
        tooltip: stateField && stateField.value ? (stateField.value as EnumValue).name : "",
        value: props.item.date,
      }}
      accessories={state.accessories}
      actions={
        <Actions
          item={props.item}
          instance={props.instance}
          getIssueDetailsCb={props.getIssueDetailsCb}
          createWorkItemCb={props.createWorkItemCb}
          applyCommandCb={props.applyCommandCb}
          getCommandSuggestions={props.getCommandSuggestions}
          getLastCommentCb={props.getLastCommentCb}
          deleteIssueCb={props.deleteIssueCb}
        />
      }
    />
  );
}
