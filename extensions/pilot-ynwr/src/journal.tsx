import UseOAuth from "./fetch/useOAuth";
import useDBLinkHook from "./hooks/DBLinkHook";
import SelectDBsForm from "./views/forms/SelectDBsForm";
import JournalView from "./views/lists/JournalView";

export default function Command() {
  const { linked } = useDBLinkHook();

  const { notion } = UseOAuth();

  return linked ? <JournalView notion={notion} /> : <SelectDBsForm notion={notion} />;
}
