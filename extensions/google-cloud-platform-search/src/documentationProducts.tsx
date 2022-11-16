import fetch from "node-fetch";
import { DiscoveryAPI } from "./types";

export async function fetchDocumentationProducts() {
  const response = await fetch("https://www.googleapis.com/discovery/v1/apis");
  const data = (await response.json()) as DiscoveryAPI;

  return data.items.filter((item) => item.preferred);
}
