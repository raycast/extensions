import { withAccessToken } from "@raycast/utils";
import { googleOAuth } from "./lib/google-oauth";
import { QuickAddView, QuickAddLaunchProps } from "./lib/quick-add-view";
import { CALENDAR_NAMES } from "./lib/parse";

function Command(props: QuickAddLaunchProps) {
  return (
    <QuickAddView
      defaultCalendarRole="shared"
      defaultCalendarFallbackName={CALENDAR_NAMES.shared}
      commandTitle="Add Shared Event"
      launchProps={props}
    />
  );
}

export default withAccessToken(googleOAuth)(Command);
