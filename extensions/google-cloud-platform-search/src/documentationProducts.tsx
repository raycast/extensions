import useSWR from "swr";
import fetch from "node-fetch";
import { DiscoveryAPI } from "./types";

async function fetchDocumentationProducts() {
  const response = await fetch("https://www.googleapis.com/discovery/v1/apis");
  const data = (await response.json()) as DiscoveryAPI;

  return data.items.filter((item) => item.preferred);
}

export function useDocumentationProducts() {
  return useSWR("documentationProducts", fetchDocumentationProducts);
}
