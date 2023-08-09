// import { useFetch as useRayFetch } from "@raycast/utils";
import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "../config/index";
import got from "got";

const preferences = getPreferenceValues<Preferences>();

const SEMANTIC_SCHOLAR_KEY = preferences.semanticscholar_api_key;

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
      Authorization: `Token ${SEMANTIC_SCHOLAR_KEY}`,
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
    .sort((a, b) => b.citedPaper.citationCount - a.citedPaper.citationCount)
    .slice(0, LIMIT)
    .map((paper) => paper.citedPaper);
}
