import { List } from "@raycast/api";
import { useState } from "react";
import { ActionItem } from "./components/ActionItem";
import { useConfig } from "./hooks/ConfigContext";

function ActionsList(actionList: any[], setSelectedAction: (action: any) => void, refreshActions: () => void) {
  return (
    <List>
      {actionList.map((item) => (
        <ActionItem key={item.id} item={item} setSelectedAction={setSelectedAction} refreshActions={refreshActions} />
      ))}
    </List>
  );
}

export default function App() {
  const [selectedAction, setSelectedAction] = useState<any | null>(null);
  const { actions, fetchActions } = useConfig();

  return ActionsList(actions, setSelectedAction, fetchActions);
}
