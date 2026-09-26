import { withAccessToken } from "@raycast/utils";
import { googleOAuth } from "./lib/google-oauth";
import { QuickAddView, QuickAddLaunchProps } from "./lib/quick-add-view";
import { CALENDAR_NAMES } from "./lib/parse";

function Command(props: QuickAddLaunchProps) {
  return (
    <QuickAddView
      defaultCalendarRole="work"
      defaultCalendarFallbackName={CALENDAR_NAMES.work}
      commandTitle="Add Work Event"
      launchProps={props}
    />
  );
}

export default withAccessToken(googleOAuth)(Command);
