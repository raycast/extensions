import got from "got";

import { FETCH_LIMIT, FIELDS, LIMIT } from "./config";
import { DataItem, SemanticScholarResponseType } from "./types";

export async function fetchPapers(paperUrl: string): Promise<DataItem[]> {
  const url = `https://api.semanticscholar.org/graph/v1/paper/URL:${paperUrl}/references`;
  const params = {
    fields: FIELDS.join(","),
    offset: "0",
    limit: `${FETCH_LIMIT}`,
  };

  const reqBody = {
    headers: {
      "Content-Type": "application/json",
    },
  };

  const queryString = new URLSearchParams(params).toString();
  const fullUrl = `${url}?${queryString}`;
  const responseString = (await got.get(fullUrl, reqBody)).body as string;
  const papersContent: SemanticScholarResponseType = JSON.parse(responseString);
  return papersContent.data;
}

export function parsePapers(papersContent: DataItem[]) {
  return papersContent
    .map((paper) => paper.citedPaper)
    .sort((a, b) => b.citationCount - a.citationCount)
    .slice(0, LIMIT)
    .filter((paper) => paper.url !== null);
}
