import { showToast, Toast, LaunchProps, Clipboard, showHUD } from "@raycast/api";
import { shorten } from "./utils";

export default async function Command(props: LaunchProps<{ arguments: Arguments.ShortenUrlWithargs }>) {
  const toast = await showToast(Toast.Style.Animated, "Shortening URL");
  try {
    const { url } = props.arguments;
    const shortlink = await shorten(url);
    await Clipboard.copy(shortlink);
    await showHUD("Copied URL to Clipboard");
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = `${error}`;
  }
}
