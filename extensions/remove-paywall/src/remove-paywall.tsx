import { Toast, getPreferenceValues, open, showToast } from "@raycast/api";
import { getUrl, isUrl } from "./utils";

export default async () => {
  const { service } = await getPreferenceValues<Preferences>();

  const url = await getUrl();

  if (url) {
    const textIsUrl = isUrl(url);

    if (!textIsUrl) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Cannot remove paywall",
        message: "No URL found in the current selection.",
      });
      return;
    }

    open(`${service}/${url}`);
  }

  await showToast({
    style: Toast.Style.Failure,
    title: "Cannot remove paywall",
    message: "No URL provided.",
  });
};
