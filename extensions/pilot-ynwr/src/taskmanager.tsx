import UseOAuth from "./fetch/useOAuth";
import useDBLinkHook from "./hooks/DBLinkHook";
import SelectDBsForm from "./views/forms/SelectDBsForm";
import TaskManagementView from "./views/lists/TaskManagementView";

export default function Command() {
  const { linked } = useDBLinkHook();
  const { notion } = UseOAuth();

  return linked ? <TaskManagementView notion={notion} /> : <SelectDBsForm notion={notion} />;
}
