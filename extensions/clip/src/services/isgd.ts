export async function shortenWithIsgd(url: string): Promise<string> {
  const requestUrl = `https://is.gd/create.php?format=json&url=${encodeURIComponent(
    url,
  )}`;

  const response = await fetch(requestUrl);
  if (!response.ok) {
    throw new Error(
      `is.gd API error: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as {
    shorturl?: string;
    errorcode?: number;
    errormessage?: string;
  };

  if (data.errorcode !== undefined) {
    throw new Error(data.errormessage ?? "is.gd API failed");
  }

  if (!data.shorturl) {
    throw new Error("is.gd API returned an unexpected response");
  }

  return data.shorturl;
}
