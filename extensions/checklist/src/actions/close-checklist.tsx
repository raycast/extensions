import { Action, Icon, Keyboard } from "@raycast/api";
import type { Checklist } from "../types";

export function CloseChecklistAction(props: {
  checklists: [Checklist[], React.Dispatch<React.SetStateAction<Checklist[]>>];
  checklist: Checklist;
}) {
  const [checklists, setChecklists] = props.checklists;

  async function closeChecklist(checklist: Checklist) {
    const checklistIndex = checklists.findIndex((q) => q.id === checklist.id);

    const newChecklists = [...checklists];

    newChecklists[checklistIndex].tasks = newChecklists[checklistIndex].tasks.map((task) => ({
      ...task,
      isCompleted: false,
    }));
    newChecklists[checklistIndex].isStarted = false;
    newChecklists[checklistIndex].progress = 0;
    setChecklists(newChecklists);
  }

  return (
    <Action
      icon={Icon.Trash}
      title="Close Checklist"
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={() => closeChecklist(props.checklist)}
    />
  );
}
