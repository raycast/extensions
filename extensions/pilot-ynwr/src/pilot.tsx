import { LaunchProps } from "@raycast/api";
import GeneralPilot from "./views/lists/GeneralPilot";
import EndTimerForm from "./views/forms/EndTimerForm";
import SelectDBsForm from "./views/forms/SelectDBsForm";
import useDBLinkHook from "./hooks/DBLinkHook";

export default function Command(p: LaunchProps) {
  const type = p.launchContext === undefined ? "null" : p.launchContext.type;
  if (type === "endtimerform") return <EndTimerForm props={p.launchContext?.props} />;

  const { linked } = useDBLinkHook();

  return linked ? <GeneralPilot /> : <SelectDBsForm />;
}
