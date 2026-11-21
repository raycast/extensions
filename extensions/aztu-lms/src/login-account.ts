import { closeMainWindow, open, showToast, Toast } from "@raycast/api";
import { clearLoginState, getSSOUrl } from "@/lib/login";
import { LMS_BASE_URL } from "./lib/constants";

export default async function Command() {
  await closeMainWindow({ clearRootSearch: true });

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Logging in...",
  });

  const data = await getSSOUrl({});

  if (data) {
    if (data.status === "new") {
      await open(data.loginLink);
      if (data.served && !(await data.served)) {
        // The browser never loaded the login page, so the saved session isn't real.
        await clearLoginState();
        await showToast({ title: "Login timed out", message: "Please try again", style: Toast.Style.Failure });
        return;
      }
    } else await open(`${LMS_BASE_URL}/announcements`);
  } else {
    await showToast({ title: "Failed to get Login URL", style: Toast.Style.Failure });
  }

  await toast.hide();
}
