import { getPreferenceValues } from "@raycast/api";
import { ErrorResult } from "./types";

const { api_key } = getPreferenceValues<Preferences>();
export const API_URL = "https://app.koyeb.com/v1/";
export const headers = {
    Authorization: `Bearer ${api_key}`,
    "Content-Type": "application/json"
}
export async function parseResponse(response: Response) {
    const result = await response.json();
    if (!response.ok) {
        const err = result as ErrorResult;
        if (err.fields?.length) throw new Error(`${err.fields[0].field} ${err.fields[0].description}`);
        throw new Error(err.message);
    }
    return result;
}

// class Koyeb {
//     private token: string;

//     constructor(token: string) {
//         this.token = token;
//     }

//     private async request(endpoint: string, {method, body}: {method:string, body?:Record<string,string>}={method: "GET"}) {
//         const response = await fetch(API_URL + endpoint, {
//             method,
//             headers,
//             body: body ? JSON.stringify(body) : undefined
//         });
//         const result = await response.json();
//         if (!response.ok) {
//             const err = result as ErrorResult;
//             if (err.fields?.length) throw new Error(`${err.fields[0].field} ${err.fields[0].description}`);
//             throw new Error(err.message);
//         }
//         return result;
//     }

//     public 
// }