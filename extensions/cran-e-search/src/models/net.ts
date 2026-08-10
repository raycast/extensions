export /** Parse the response from the fetch query into something we can display */
async function parseFetchResponse<Hit>(response: Response): Promise<Hit[]> {
  type ResultBody = {
    hits: Hit[];
    total: number;
    page: number;
    size: number;
    isEnd: boolean;
  };

  const json = (await response.json()) as ResultBody | { code: string; message: string };

  if (!response.ok || "message" in json) {
    throw new Error("message" in json ? json.message : response.statusText);
  }

  // We ignore the pagination data and just return the hits
  // since we're not using it right now.
  return json.hits;
}

export function composeSearchParams(searchText: string) {
  const params = new URLSearchParams();

  if (searchText.length > 0) {
    params.set("q", searchText);
    params.set("size", "50");
  } else {
    params.set("all", "true");
    params.set("size", "30");
  }

  return params;
}
