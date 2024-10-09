import useDBLinkHook from "./hooks/DBLinkHook";
import SelectDBsForm from "./views/forms/SelectDBsForm";
import TaskManagementView from "./views/lists/TaskManagementView";

export default function Command() {
  const { linked } = useDBLinkHook();

  return linked ? <TaskManagementView /> : <SelectDBsForm />;
}
