import fetch from "node-fetch";

/**
 * Fetch Open Graph Image Url
 * @param url The Url to fetch the Open Graph Image Url for
 */
export async function fetchOpenGraphImageUrl(url: string): Promise<string> {
  // Fetch response from url
  const response = await fetch(url);
  // Retrieve HTML text content
  const html = await response.text();
  // Extract image url from html
  const imageUrl = html.split('<meta property="og:image" content="').at(1)?.split('"').at(0);
  // Check if image url is available
  if (imageUrl) {
    // Return url
    return imageUrl;
  } else {
    // Otherwise throw an error
    throw Error("Failed to retrieve Open Graph image url");
  }
}
