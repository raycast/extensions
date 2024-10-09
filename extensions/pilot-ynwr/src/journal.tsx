import useDBLinkHook from "./hooks/DBLinkHook";
import SelectDBsForm from "./views/forms/SelectDBsForm";
import JournalView from "./views/lists/JournalView";

export default function Command() {
  const { linked } = useDBLinkHook();

  return linked ? <JournalView /> : <SelectDBsForm />;
}
