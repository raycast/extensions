import useDBLinkHook from "./hooks/DBLinkHook";
import SelectDBsForm from "./views/forms/SelectDBsForm";
import PilotMenuBar from "./views/menubars/PilotMenuBar";

export default function Command() {
  const { linked } = useDBLinkHook();

  return linked ? <PilotMenuBar /> : <SelectDBsForm />;
}
