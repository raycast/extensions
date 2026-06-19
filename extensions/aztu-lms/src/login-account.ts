import { closeMainWindow, open, showToast, Toast } from "@raycast/api";
import { getSSOUrl } from "@/lib/login";
import { LMS_BASE_URL } from "./lib/constants";

export default async function Command() {
  await closeMainWindow({ clearRootSearch: true });

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Logging in...",
  });

  const data = await getSSOUrl({});

  if (data) {
    if (data.status === "new") await open(data.loginLink);
    else await open(LMS_BASE_URL);
  } else {
    await showToast({ title: "Failed to get Login URL", style: Toast.Style.Failure });
  }

  await toast.hide();
}
