import { Clipboard, LaunchProps, Toast, open, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { shortenUrl } from "./api";

export default async function Command(
  props: LaunchProps<{ arguments: Arguments.ShortenUrl }>,
) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Creating short link",
  });

  try {
    const result = await shortenUrl(props.arguments);

    await Clipboard.copy(result.short_url);
    toast.style = Toast.Style.Success;
    toast.title = "Short link copied";
    toast.message = result.short_url;
    toast.primaryAction = {
      title: "Open Short Link",
      onAction: () => open(result.short_url),
    };
  } catch (error) {
    await showFailureToast(error, { title: "Could not create short link" });
  }
}
