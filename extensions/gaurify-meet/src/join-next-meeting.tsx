import { closeMainWindow, open, showHUD, showToast, Toast } from "@raycast/api";
import { appUrl, getUpcoming } from "./lib/api";
import { firstName, isJoinable } from "./lib/format";
import { failToast } from "./lib/ui";

export default async function Command() {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Finding your next meeting" });
  try {
    const next = (await getUpcoming()).find((b) => isJoinable(b) && b.meet_url);
    await toast.hide();
    if (!next || !next.meet_url) {
      await showHUD("No meeting to join right now");
      return;
    }
    await closeMainWindow();
    await open(next.meet_url);
    await showHUD(`Joining ${firstName(next.guest_name)}`);
  } catch (e) {
    await toast.hide();
    await failToast(e, "Couldn't find your meeting");
    await open(appUrl("bookings"));
  }
}
