import { withAccessToken } from "@raycast/utils";
import { basecamp } from "./oauth/auth";
import ScheduleMeetingForm from "./components/ScheduleMeetingForm";

function ScheduleMeetingCommand() {
  return <ScheduleMeetingForm />;
}

export default withAccessToken(basecamp)(ScheduleMeetingCommand);
