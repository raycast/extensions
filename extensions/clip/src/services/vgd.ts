export async function shortenWithVgd(url: string): Promise<string> {
  const requestUrl = `https://v.gd/create.php?format=json&url=${encodeURIComponent(
    url,
  )}`;

  const response = await fetch(requestUrl);
  if (!response.ok) {
    throw new Error(
      `v.gd API error: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as {
    shorturl?: string;
    errorcode?: number;
    errormessage?: string;
  };

  if (data.errorcode !== undefined) {
    throw new Error(data.errormessage ?? "v.gd API failed");
  }

  if (!data.shorturl) {
    throw new Error("v.gd API returned an unexpected response");
  }

  return data.shorturl;
}
