import { open, showHUD } from "@raycast/api";
import { calendarWebUrlBase, getAuthorizedCalendarClient } from "./lib/api";
import { showFailureToast } from "@raycast/utils";

export default async function OpenInBrowserMain() {
  try {
    const calendar = await getAuthorizedCalendarClient();
    const url = await calendarWebUrlBase(calendar);
    await open(url);
    showHUD("Open in Browser");
  } catch (error) {
    showFailureToast(error);
  }
}
