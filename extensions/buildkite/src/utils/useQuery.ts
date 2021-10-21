import { getPreferenceValues, showToast, ToastStyle } from "@raycast/api";
import fetch from "node-fetch";
import { useEffect, useState } from "react";

type Variables = Record<string, string>;

interface GraphQLResponse<T> {
  data: T;
  errors?: {
    message: string;
  }[];
}

async function graphql<T>(query: string, variables?: Variables) {
  const preferences = getPreferenceValues();

  const res = await fetch("https://graphql.buildkite.com/v1", {
    method: "POST",
    body: JSON.stringify({ query, variables }),
    headers: {
      Authorization: `Bearer ${preferences.token}`,
    },
  });

  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`);
  }

  const { errors, data } = (await res.json()) as GraphQLResponse<T>;

  if (errors?.length) {
    throw new Error(errors[0].message);
  }

  return data;
}

export function useQuery<T>(
  queryKey: string[],
  options: {
    query: string;
    errorMessage: string;
    variables?: Variables;
  }
) {
  const [state, setState] = useState<T>();

  useEffect(() => {
    graphql<T>(options.query, options.variables)
      .then(setState)
      .catch((error) => {
        console.error(error);
        showToast(ToastStyle.Failure, options.errorMessage);
      });
  }, queryKey);

  return state;
}
