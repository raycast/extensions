import { Clipboard, open, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { looksLikeHtml, publishHtml, suggestSlug } from "./lib/api";
import { getOwnerToken, saveIssuedToken } from "./lib/token";

export default async function Command() {
  const html = (await Clipboard.readText())?.trim();
  if (!html) {
    await showToast({ style: Toast.Style.Failure, title: "Clipboard is empty", message: "Copy some HTML first." });
    return;
  }
  if (!looksLikeHtml(html)) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No HTML on the clipboard",
      message: "Copy an HTML document or snippet first.",
    });
    return;
  }

  const toast = await showToast({ style: Toast.Style.Animated, title: "Publishing clipboard HTML…" });
  try {
    const result = await publishHtml({ html, slug: suggestSlug("clip"), token: await getOwnerToken() });
    await saveIssuedToken(result.token);
    await Clipboard.copy(result.url);
    toast.style = Toast.Style.Success;
    toast.title = "Published, URL copied";
    toast.message = result.url;
    toast.primaryAction = {
      title: "Open in Browser",
      shortcut: { modifiers: ["cmd"], key: "o" },
      onAction: () => open(result.url),
    };
  } catch (error) {
    await showFailureToast(error, { title: "Could not publish" });
  }
}
