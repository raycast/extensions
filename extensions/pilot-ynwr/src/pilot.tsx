import { LaunchProps } from "@raycast/api";
import GeneralPilot from "./views/lists/GeneralPilot";
import EndTimerForm from "./views/forms/EndTimerForm";
import SelectDBsForm from "./views/forms/SelectDBsForm";
import useDBLinkHook from "./hooks/DBLinkHook";
import UseOAuth from "./fetch/useOAuth";

export default function Command(p: LaunchProps) {
  const type = p.launchContext === undefined ? "null" : p.launchContext.type;
  if (type === "endtimerform") return <EndTimerForm props={p.launchContext?.props} />;

  const { notion } = UseOAuth();

  const { linked } = useDBLinkHook();

  return linked ? <GeneralPilot notion={notion} /> : <SelectDBsForm notion={notion} />;
}
