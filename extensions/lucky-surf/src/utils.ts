import { Clipboard, getSelectedText } from "@raycast/api";
import fetch from "node-fetch";

export async function getUrl(queryArgument: string | undefined): Promise<string> {
  let query: string | undefined;

  if (queryArgument) {
    // If the user has provided a query, use that
    query = queryArgument;
  } else {
    try {
      // If the user has selected text, use that as the query
      query = await getSelectedText();
    } catch {
      // Otherwise, use the clipboard
      query = await Clipboard.readText();
    }
  }

  if (!query) {
    throw new Error("No query provided.");
  }

  const request = await fetch(`https://lucky.surf/${encodeURIComponent(query)}`, {
    headers: { Accept: "application/json" },
  });

  const response = (await request.json()) as { url: string };
  console.log(query);
  console.log(response);
  return response.url;
}
