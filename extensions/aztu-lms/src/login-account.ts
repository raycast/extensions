import { closeMainWindow, open, showToast, Toast } from "@raycast/api";
import { getJWTToken, getSSOUrl } from "@/lib/login";
import { LMS_BASE_URL } from "./lib/constants";

export default async function Command() {
  await closeMainWindow({ clearRootSearch: true });

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Logging in...",
  });

  const [data] = await Promise.all([getSSOUrl({ forLogin: true }), getJWTToken()]);

  if (data) {
    if (data.status === "new") await open(data.loginLink);
    else await open(LMS_BASE_URL);
  } else {
    await showToast({ title: "Failed to get Login URL", style: Toast.Style.Failure });
  }

  await toast.hide();
}
