import { IconMetadata, IconsResponse, SearchIcon } from "../types.ts";

export async function search(
  apiKey: string,
  page: number,
  query?: string,
): Promise<IconsResponse> {
  const searchResponse = await fetch("https://api.macosicons.com/api/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      query,
      searchOptions: {
        hitsPerPage: 100,
        sort: ["timeStamp:desc"],
        page: page + 1,
      },
    }),
  });

  if (searchResponse.ok) {
    const data = await searchResponse.json();

    if (!data.hits || !Array.isArray(data.hits)) {
      throw new Error("Invalid API response: missing or invalid hits array");
    }

    return {
      ...data,
      hits: data.hits
        .filter((icon: SearchIcon) => icon.appName)
        .map((icon: SearchIcon) => {
          const result: IconMetadata = {
            ...icon,
            name: icon.appName,
            uploadedAt: icon.timeStamp,
            updatedAt: Date.now(),
          };
          return result;
        }),
    };
  }

  let errorMessage: string;
  const responseText = await searchResponse.text();

  try {
    const errorData: { message?: string } = JSON.parse(responseText);
    errorMessage =
      errorData.message || searchResponse.statusText || "Search request failed";
  } catch {
    errorMessage = `API returned HTTP error ${searchResponse.status} with non-JSON body:\n\n${responseText}`;
  }

  throw new Error(errorMessage);
}
