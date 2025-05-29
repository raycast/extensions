import { showHUD, Clipboard } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

async function unfollowRedirects(url: string): Promise<string> {
  // Follow redirects to get the final URL
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
    });
    return response.url;
  } catch {
    throw new Error("Failed to un-shorten URL");
  }
}

export default async function main() {
  try {
    // Read the current clipboard content
    const clipboardText = await Clipboard.readText();

    if (!clipboardText) {
      throw new Error("No text found in clipboard");
    }

    // Check if the clipboard contains a URL
    let url: URL;
    try {
      url = new URL(clipboardText);
    } catch {
      throw new Error("Clipboard content is not a valid URL");
    }

    // Check if this is an Amazon short URL that needs to be unshortened
    const amazonShortDomains = ["a.co", "amzn.to", "amzn.com"];
    const isAmazonShortUrl = amazonShortDomains.some(
      (domain) => url.hostname === domain || url.hostname === `www.${domain}`,
    );

    // Set the final URL based on whether it's a short URL or not
    let finalUrl = url;
    if (isAmazonShortUrl) {
      // Unshorten the URL by following redirects
      const unshortenedUrl = await unfollowRedirects(clipboardText);
      finalUrl = new URL(unshortenedUrl);
    }

    // Check if the final URL is from Amazon
    const validAmazonDomains = {
      us: "www.amazon.com",
      uk: "www.amazon.co.uk",
      ca: "www.amazon.ca",
      de: "www.amazon.de",
      es: "www.amazon.es",
      fr: "www.amazon.fr",
      it: "www.amazon.it",
      jp: "www.amazon.co.jp",
      in: "www.amazon.in",
      cn: "www.amazon.cn",
      sg: "www.amazon.com.sg",
      mx: "www.amazon.com.mx",
      ae: "www.amazon.ae",
      br: "www.amazon.com.br",
      nl: "www.amazon.nl",
      au: "www.amazon.com.au",
      tr: "www.amazon.com.tr",
      sa: "www.amazon.sa",
      se: "www.amazon.se",
      pl: "www.amazon.pl",
    };
    const isValidAmazonDomain = Object.values(validAmazonDomains).some((domain) => finalUrl.hostname === domain);
    if (!isValidAmazonDomain) {
      throw new Error(`URL ${finalUrl.href} is not an Amazon product page`);
    }

    // Extract the ASIN from the URL path
    const pathParts = finalUrl.pathname.split("/");
    const dpIndex = pathParts.findIndex((part) => part === "dp");

    if (dpIndex === -1 || dpIndex + 1 >= pathParts.length) {
      throw new Error(`Could not find product identifier in Amazon URL ${finalUrl.href}`);
    }

    // The ASIN is expected to be 10 characters long and follows the "dp" segment
    const asin = pathParts[dpIndex + 1];
    if (!asin || asin.length !== 10) {
      throw new Error(`Invalid ASIN found in Amazon URL ${finalUrl.href}`);
    }

    // Create the shortened URL using the final URL's domain
    const shortenedUrl = `${finalUrl.protocol}//${finalUrl.hostname}/dp/${asin}`;

    // Copy the shortened URL to clipboard
    await Clipboard.copy(shortenedUrl);
    await showHUD("Shortened Amazon URL copied to clipboard");
  } catch (error) {
    await showFailureToast(error, { title: "Failed to shorten Amazon URL" });
  }
}
