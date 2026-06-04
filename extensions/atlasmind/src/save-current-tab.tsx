import { getFrontmostApplication, showHUD } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { saveItem, updateItem } from "./db";
import { fetchOg } from "./fetch-og";

const BROWSERS = new Set([
  "Safari",
  "Google Chrome",
  "Arc",
  "Brave Browser",
  "Microsoft Edge",
  "Vivaldi",
  "Opera",
]);

export default async function Command() {
  const app = await getFrontmostApplication();
  if (!BROWSERS.has(app.name)) {
    await showHUD(`No browser tab found (frontmost: ${app.name})`);
    return;
  }

  const script =
    app.name === "Safari"
      ? `tell application "Safari" to return (URL of current tab of front window) & "|||" & (name of current tab of front window)`
      : `tell application "${app.name}" to return (URL of active tab of front window) & "|||" & (title of active tab of front window)`;

  let url = "";
  let title = "";
  try {
    const raw = await runAppleScript(script);
    [url, title] = raw.split("|||");
  } catch {
    await showHUD("Couldn't read browser tab — is a tab open?");
    return;
  }

  if (!url) {
    await showHUD("No URL found in front tab");
    return;
  }

  const item = await saveItem({
    type: "url",
    content: url.trim(),
    title: (title ?? "").trim(),
    tags: "",
  });

  const { image, title: ogt } = await fetchOg(item.content);
  if (image || ogt)
    await updateItem(item.id, { og_image: image, og_title: ogt });

  await showHUD(
    image
      ? `✅ Saved with preview: ${title || url}`
      : `✅ Saved: ${title || url}`,
  );
}
