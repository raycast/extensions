import { closeMainWindow, getFrontmostApplication, showToast, Toast } from "@raycast/api";
import { getBrowserURL, openURL } from "./utils";

const command = async () => {
  await closeMainWindow();
  await showToast({ title: "Opening in Shopify admin...", style: Toast.Style.Animated });

  const frontmostApp = await getFrontmostApplication();

  if (frontmostApp.bundleId !== "com.apple.finder") {
    const url = await getBrowserURL(frontmostApp.name);

    if (!url) {
      await showToast({ title: "You don't have any website open", style: Toast.Style.Failure });
      return;
    }

    const urlParts = url.split("/");

    if (urlParts.length < 2) {
      await showToast({ title: "It is not a Shopify store", style: Toast.Style.Failure });
    }

    const storeDomain = urlParts[2];
    const path = encodeURIComponent("/" + urlParts.slice(3).join("/"));

    const editorURL = `https://${storeDomain}/admin/themes/current/editor?previewPath=${path}`;

    await openURL({ appName: frontmostApp.name, url: editorURL });
  }
};

export default command;
