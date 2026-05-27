import { getPreferenceValues } from "@raycast/api";

type ReadwisePreferences = {
  readwiseToken?: string;
};

class ReadwiseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReadwiseError";
  }
}

export function hasReadwiseToken(): boolean {
  const prefs = getPreferenceValues<ReadwisePreferences>();
  return !!prefs.readwiseToken?.trim();
}

export async function saveToReadwise(params: {
  url: string;
  title?: string;
  author?: string;
  summary?: string;
}): Promise<void> {
  const prefs = getPreferenceValues<ReadwisePreferences>();
  const token = prefs.readwiseToken?.trim();

  if (!token) {
    throw new ReadwiseError("Readwise access token not configured. Set it in Raycast preferences.");
  }

  const body: Record<string, string> = { url: params.url };
  if (params.title) body.title = params.title;
  if (params.author) body.author = params.author;
  if (params.summary) body.summary = params.summary;

  const response = await fetch("https://readwise.io/api/v3/save/", {
    method: "POST",
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new ReadwiseError("Readwise authentication failed. Check your access token in Raycast preferences.");
    }
    const text = await response.text().catch(() => "");
    throw new ReadwiseError(`Failed to save to Readwise (${response.status}): ${text || response.statusText}`);
  }
}

export { ReadwiseError };