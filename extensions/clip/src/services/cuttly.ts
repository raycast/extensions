const statusMessages: Record<number, string> = {
  1: "The shortened link comes from the domain that shortens the link",
  2: "The entered link is not a link",
  3: "The preferred link name is already taken",
  4: "Invalid API key",
  5: "The link has not passed the validation",
  6: "The link provided is from a blocked domain",
};

function randomName(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from(
    { length: 7 },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join("");
}

export async function shortenWithCuttly(
  url: string,
  apiKey: string,
): Promise<string> {
  const requestUrl = `https://cutt.ly/api/api.php?key=${apiKey}&short=${encodeURIComponent(
    url,
  )}&name=${randomName()}`;

  const response = await fetch(requestUrl);
  if (!response.ok) {
    throw new Error(
      `cutt.ly API error: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as {
    url?: { status: number; shortLink: string };
  };
  const result = data.url;

  if (!result) {
    throw new Error("cutt.ly API returned an unexpected response");
  }

  if (result.status === 7) {
    return result.shortLink;
  }

  throw new Error(statusMessages[result.status] ?? "cutt.ly API failed");
}
