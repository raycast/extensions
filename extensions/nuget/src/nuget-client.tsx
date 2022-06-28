import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";
import { NugetPackage } from "./NugetPackage";
import { FetchResponse } from "./utils";

export async function searchNuget(query?: string, fetchId?: string): Promise<FetchResponse<NugetPackage[]>> {
    const _preference = getPreferenceValues();
    let numofElements = 25;
    try {
        numofElements = parseInt(_preference["element-to-fetch"]);
    }
    catch
    {
        numofElements = 25
    }

    let _query = "";
    if (query) {
        _query = "&q=" + query;
    }

    const response = await fetch("https://azuresearch-usnc.nuget.org/query?take=" + numofElements + _query, { method: 'GET' });
    const data: NugetPackage[] = JSON.parse(await response.text()).data;

    const _fetchResponse: FetchResponse<NugetPackage[]> = { fetchId: fetchId, data: data };
    return _fetchResponse;
}

export async function searchReadMe(_package: NugetPackage): Promise<string> {
    return _package.description;

    // const lastVersion = _.find(_package.versions, (o) => { return o.version === _package.version; });
    // const catalogEntryUrl = JSON.parse((await fetch(lastVersion["@id"])).text()).catalogEntry;
    // const respobj = await (await fetch(catalogEntryUrl)).json();
    // const readmeFile = respobj.readmeFile;
    // const readmeUrl = _.find(respobj.packageEntries, (o) => { return o.fullName === readmeFile})["@id"];
    // return (await (await fetch(readmeUrl)).text());
}