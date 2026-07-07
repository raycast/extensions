export async function shortenWithTinyurl(url: string): Promise<string> {
  const requestUrl = `https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`;

  const response = await fetch(requestUrl);
  if (!response.ok) {
    throw new Error(`TinyURL API error: ${response.status} ${response.statusText}`);
  }

  const text = await response.text();
  if (!text.startsWith("http")) {
    throw new Error(`TinyURL API failed: ${text}`);
  }
  return text;
}
