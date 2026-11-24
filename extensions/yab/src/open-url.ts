import { Clipboard, LaunchProps, showToast, Toast } from "@raycast/api";
import { failed, openTab, searchUrl, toUrl } from "./yab";

export default async function Command(props: LaunchProps<{ arguments: { url?: string } }>) {
  let text = props.arguments.url?.trim() ?? "";
  if (!text) {
    const clip = (await Clipboard.readText())?.trim() ?? "";
    if (!toUrl(clip)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No URL given",
        message: "The clipboard has no URL either",
      });
      return;
    }
    text = clip;
  }
  await openTab(toUrl(text) ?? searchUrl(text)).catch((e) => failed("Could not open the URL", e));
}
