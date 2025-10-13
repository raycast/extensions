import { getPreferenceValues } from "@raycast/api";
import { Attio } from "attio-js";
import { QueryRecordsResponse } from "./types";
const {access_token} = getPreferenceValues<Preferences>()

export const attio = new Attio({
    apiKey: access_token,    
})

export async function queryRecords({objectId}:{objectId: string}) {
    // This crashes since web_url is passed so we bypass using a manual fetch
    // const {data} = await attio.records.query({object: objectId, requestBody: {}})
    const response = await fetch(new URL(`v2/objects/${objectId}/records/query`, attio._baseURL?.origin), {
        method: "POST",
        headers: {
            Authorization: `Bearer ${attio._options.apiKey}`
        }
    })
    const result = await response.json();
    if (!response.ok) throw new Error((result as Error).message);
    return result as QueryRecordsResponse;
}