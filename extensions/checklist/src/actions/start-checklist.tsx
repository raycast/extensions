import { Action, Icon } from "@raycast/api";
import { ViewChecklist } from "../components/view-checklist";
import type { Checklist } from "../types";

export function StartChecklistAction(props: {
  checklist: Checklist;
  checklists: [Checklist[], React.Dispatch<React.SetStateAction<Checklist[]>>];
  title: string;
}) {
  return (
    <Action.Push
      icon={Icon.Play}
      title={props.title}
      target={<ViewChecklist checklist={props.checklist} checklists={props.checklists} />}
    />
  );
}
