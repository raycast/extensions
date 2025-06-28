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

  const data = await searchResponse.json();

  if (searchResponse.ok) {
    return {
      ...data,
      hits: data.hits.map((icon: SearchIcon) => {
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

  throw new Error(
    data.message || searchResponse.statusText || "Search request failed",
  );
}
