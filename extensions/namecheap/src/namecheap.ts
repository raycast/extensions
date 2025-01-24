import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { ArrOrObj, DomainGetListResult, ErrorCall, NCResponse } from "./types";
import * as xml2js from "xml2js";

function isErrorCall(result: NCResponse<unknown>): result is ErrorCall {
    return result.ApiResponse.$.Status==="ERROR";
}

const { Sandbox, ...preferences } = getPreferenceValues<Preferences>();
    const ApiUrl = Sandbox ? `https://api.sandbox.namecheap.com/xml.response` : `https://api.namecheap.com/xml.response`;
    
    const generateUrl = (command: string) => ApiUrl + "?" + new URLSearchParams({
        ...preferences,
        Command: `namecheap.${command}`
    })
    const parseResponse = async (response: Response) => {
        const xml = await response.text();
        const result: NCResponse<T> = await xml2js.parseStringPromise(xml, { explicitArray: false });
        if (isErrorCall(result)) throw new Error(result.ApiResponse.Errors.Error._);
        const { $: _, ...rest } = result.ApiResponse.CommandResponse;
        return rest;
    }

const parseAsArray = <T>(res: ArrOrObj<T>) => res instanceof Array ? res : [res];

export const useListDomains = () => useFetch(generateUrl("domains.getList"), {
    parseResponse,
    mapResult(result: DomainGetListResult) {
        const data = parseAsArray(result.DomainGetListResult.Domain).map(domain => domain.$);
        return {
            data
        }
    },
    initialData: []
})