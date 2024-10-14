import UseOAuth from "./fetch/useOAuth";
import useDBLinkHook from "./hooks/DBLinkHook";
import SelectDBsForm from "./views/forms/SelectDBsForm";
import CalendarView from "./views/lists/CalendarView";

export default function Command() {
  const { linked } = useDBLinkHook();

  const { notion } = UseOAuth();

  return linked ? <CalendarView notion={notion} /> : <SelectDBsForm notion={notion} />;
}
