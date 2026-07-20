import { getPreferenceValues } from "@raycast/api";
import { Attio } from "attio-js";
import { QueryRecordsResponse } from "./types";
import { APIError } from "attio-js/dist/commonjs/models/errors/apierror";
const { access_token } = getPreferenceValues<Preferences>();

export const attio = new Attio({
  apiKey: access_token,
});

export async function queryRecords({ objectId }: { objectId: string }) {
  // 👇 This crashes since web_url is passed which zod does not expect so we bypass using a manual fetch
  // const {data} = await attio.records.query({object: objectId, requestBody: {}})
  const response = await fetch(new URL(`v2/objects/${objectId}/records/query`, attio._baseURL?.origin), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${attio._options.apiKey}`,
    },
  });
  const result = await response.json();
  if (!response.ok) throw new Error((result as Error).message);
  return result as QueryRecordsResponse;
}

export function parseErrorMessage(error: unknown): string {
  switch ((error as Error).name) {
    case "APIError": {
      const err = error as APIError;
      const body: Error = JSON.parse(err.body);
      return body.message;
    }
    default:
      return `${error}`;
  }
}
