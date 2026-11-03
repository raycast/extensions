import { Extension } from "../model";

export function storeListing(
  extension: Pick<Extension, "id" | "browser" | "provenance" | "updateUrl">,
): { title: string; url: string } | undefined {
  if (extension.provenance !== "Web Store") return;
  let host = "";
  try {
    host = new URL(extension.updateUrl).hostname;
  } catch {
    /* Older manifests may omit the update URL. */
  }
  if (host === "edge.microsoft.com")
    return {
      title: "Open Edge Add-ons Listing",
      url: `https://microsoftedge.microsoft.com/addons/detail/${extension.id}`,
    };
  if (host === "clients2.google.com" || (!extension.updateUrl && extension.browser !== "edge"))
    return { title: "Open Chrome Web Store Listing", url: `https://chromewebstore.google.com/detail/${extension.id}` };
}
