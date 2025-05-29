import { showHUD, Clipboard } from "@raycast/api";

export default async function main() {
  try {
    // Read the current clipboard content
    const clipboardText = await Clipboard.readText();

    if (!clipboardText) {
      await showHUD("No text found in clipboard");
      return;
    }

    // Check if the clipboard contains a URL
    let url: URL;
    try {
      url = new URL(clipboardText);
    } catch {
      await showHUD("Clipboard doesn't contain a valid URL");
      return;
    }

    // Check if the URL is from Amazon
    if (!url.hostname.includes("amazon")) {
      await showHUD("URL is not from Amazon");
      return;
    }

    // Extract the ASIN from the URL path
    const pathParts = url.pathname.split("/");
    const dpIndex = pathParts.findIndex((part) => part === "dp");

    if (dpIndex === -1 || dpIndex + 1 >= pathParts.length) {
      await showHUD("Could not find product identifier in Amazon URL");
      return;
    }

    const asin = pathParts[dpIndex + 1];

    // Create the shortened URL using the original domain
    const shortenedUrl = `${url.protocol}//${url.hostname}/dp/${asin}`;

    // Copy the shortened URL to clipboard
    await Clipboard.copy(shortenedUrl);
    await showHUD("Shortened Amazon URL copied to clipboard");
  } catch (error) {
    await showFailureToast(error, { title: "Failed to process clipboard content" });
  }
}
