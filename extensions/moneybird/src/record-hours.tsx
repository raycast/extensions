import { withAccessToken } from "@raycast/utils";
import { provider } from "./oauth/client";
import RecordHoursForm from "./record-hours-form";

function Command() {
  return <RecordHoursForm useStartTime />;
}

export default withAccessToken(provider)(Command);
