import { getPreferenceValues } from "@raycast/api";
import fetch, { Response } from "node-fetch";

const HASHNODE_URL = "https://gql.hashnode.com/";

async function gql<T>(query: string, variables = {}): Promise<T> {
  const { token } = getPreferenceValues<Preferences>();

  return fetch(HASHNODE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  })
    .then((response: Response) => {
      if (!response.ok) {
        throw new Error("Failed loading stories");
      }
      return response.json() as Promise<{ data: T; errors: [{ message: string }] }>;
    })
    .then(({ data, errors }) => {
      if (errors) {
        throw new Error(errors[0]?.message ?? "An error occured");
      }
      return data;
    });
}

export default gql;
