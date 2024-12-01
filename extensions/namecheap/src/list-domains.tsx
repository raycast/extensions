import { Detail, getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import * as xml2js from "xml2js";

type ErrorCall = {
    ApiResponse: {
        $: {
        Status: "ERROR";
    }
    Errors: {
        Error: {
            _: string;
            $: {
                Number: string;
            }
        }
    }
    Server: string;
        GMTTimeDifference: string;
        ExecutionTime: string;
}
}
type SuccessCall<T> = {
    ApiResponse: {
        $: {
            Status: "OK";
        }
        CommandResponse: T;
    Server: string;
        GMTTimeDifference: string;
        ExecutionTime: string;
}
}
type NCResponse<T> = ErrorCall | SuccessCall<T>;

function isErrorCall(result: NCResponse<unknown>): result is ErrorCall {
    return result.ApiResponse.$.Status==="ERROR";
}

export default function ListDomains() {
    const { Sandbox, ...preferences } = getPreferenceValues<Preferences>();
    const ApiUrl = Sandbox ? `https://api.sandbox.namecheap.com/xml.response` : `https://api.namecheap.com/xml.response`;
    const { isLoading, data } = useFetch(ApiUrl + new URLSearchParams({
        ...preferences,
        Command: "namecheap.users.address.getList"
    }), {
        async parseResponse(response) {
            const xml = await response.text();
            const result: NCResponse<unknown> = await xml2js.parseStringPromise(xml, { explicitArray: false });
            if (isErrorCall(result)) throw new Error(result.ApiResponse.Errors.Error._);
            else return result.ApiResponse.CommandResponse;
        },
    })

    return <Detail isLoading={isLoading} markdown={JSON.stringify(data)} />
}