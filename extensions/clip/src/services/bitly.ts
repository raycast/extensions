export async function shortenWithBitly(
  url: string,
  apiKey: string,
): Promise<string> {
  const response = await fetch("https://api-ssl.bitly.com/v4/shorten", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ long_url: url, domain: "bit.ly" }),
  });

  if (!response.ok) {
    throw new Error(
      `bit.ly API error: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as { link: string };
  return data.link;
}
