import useDBLinkHook from "./hooks/DBLinkHook";
import SelectDBsForm from "./views/forms/SelectDBsForm";
import CalendarView from "./views/lists/CalendarView";

export default function Command() {
  const { linked } = useDBLinkHook();

  return linked ? <CalendarView /> : <SelectDBsForm />;
}
