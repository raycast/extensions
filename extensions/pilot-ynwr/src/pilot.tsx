import { LaunchProps } from "@raycast/api";
import GeneralPilot from "./views/lists/GeneralPilot";
import EndTimerForm from "./views/forms/EndTimerForm";

export default function Command(p: LaunchProps) {
  const type = p.launchContext === undefined ? "null" : p.launchContext.type;
  if (type === "endtimerform") return <EndTimerForm props={p.launchContext?.props} />;

  return <GeneralPilot />;
}
