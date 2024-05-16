import { List } from "@raycast/api";
import { ActionItem } from "./components/ActionItem";
import { useConfig } from "./hooks/ConfigContext";
import { IAction } from "./constants/initialActions";

function ActionsList(actionList: IAction[], refreshActions: () => void) {
  return (
    <List>
      {actionList.map((item) => (
        <ActionItem key={item.id} item={item}  refreshActions={refreshActions} />
      ))}
    </List>
  );
}

export default function App() {
  const { actions, fetchActions } = useConfig();

  return ActionsList(actions, fetchActions);
}
