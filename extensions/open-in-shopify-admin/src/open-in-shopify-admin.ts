import { closeMainWindow, getFrontmostApplication, showToast, Toast } from "@raycast/api";
import { getBrowserURL, openURL } from "./utils";

const command = async () => {
  await closeMainWindow();
  await showToast({ title: "Opening in Shopify admin...", style: Toast.Style.Animated });

  const frontmostApp = await getFrontmostApplication();

  const url = await getBrowserURL(frontmostApp.name);

  if (!url) {
    await showToast({ title: "You don't have any website open", style: Toast.Style.Failure });
    return;
  }

  const browserURL = new URL(url);
  const storeDomain = browserURL.origin;
  const path = encodeURIComponent(browserURL.pathname);

  const editorURL = `${storeDomain}/admin/themes/current/editor?previewPath=${path}`;

  await openURL({ appName: frontmostApp.name, url: editorURL });
};

export default command;
