import { Action, Icon } from "@raycast/api";
import ViewChecklist from "../components/viewChecklist";
import type { Checklist } from "../types";

function StartChecklistAction(props: {
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

export default StartChecklistAction;
