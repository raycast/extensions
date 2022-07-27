import fetch from "node-fetch";
import { NugetPackage } from "./NugetPackage";
import { FetchResponse } from "./utils";

export async function searchNuget(query?: string, fetchId?: string): Promise<FetchResponse<NugetPackage[]>> {
  let _query = "";
  if (query) {
    _query = "&q=" + query;
  }

  const response = await fetch(`https://azuresearch-usnc.nuget.org/query?${_query}`, {
    method: "GET",
  });
  const data: NugetPackage[] = JSON.parse(await response.text()).data;

  const _fetchResponse: FetchResponse<NugetPackage[]> = { fetchId: fetchId, data: data };
  return _fetchResponse;
}

export async function searchReadMe(_package: NugetPackage): Promise<string> {
  return _package.description;
}
