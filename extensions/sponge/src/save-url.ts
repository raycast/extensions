import { Clipboard, LaunchProps, Toast, showHUD, showToast } from "@raycast/api";
import { showError } from "./components";
import { saveUrl } from "./sponge";

function parseUrl(text: string | undefined): string | undefined {
  if (!text) return undefined;
  try {
    const url = new URL(text.trim());
    if ((url.protocol === "https:" || url.protocol === "http:") && !url.username && !url.password) return url.href;
  } catch {
    return undefined;
  }
  return undefined;
}

export default async function Command(props: LaunchProps<{ arguments: Arguments.SaveUrl }>) {
  const typed = props.arguments.url?.trim();
  const url = typed ? parseUrl(typed) : parseUrl(await Clipboard.readText());
  if (!url) {
    await showToast({
      style: Toast.Style.Failure,
      title: typed ? "Enter an HTTP or HTTPS URL" : "No URL entered or copied",
      message: "Links with a user name or password are not saved.",
    });
    return;
  }

  const toast = await showToast({ style: Toast.Style.Animated, title: "Adding to Sponge…" });
  try {
    const result = await saveUrl(url);
    await toast.hide();
    await showHUD(result.duplicate ? "Already in Sponge" : "Queued for capture in Sponge");
  } catch (error) {
    await toast.hide();
    await showError(error);
  }
}
