import { getPreferenceValues } from "@raycast/api";
import { request } from "graphql-request";

export async function fetcher({ document, variables = {}, headers = {} }: any) {
  const { graphqlEndpoint, username, token } = getPreferenceValues();

  return request(
    graphqlEndpoint,
    document,
    {
      username,
      ...variables,
    },
    {
      Authorization: `Bearer ${token}`,
      ...headers,
    }
  );
}

export const groupBy = <T, K extends keyof T>(arr: T[], key: K) => {
  return arr.reduce((r, a) => {
    const v = a[key];
    (r as any)[v] = [...((r as any)[v] || []), a];
    return r;
  }, {} as Record<string, T[]>);
};

export const partition = <T>(arr: T[], predicate: (item: T) => boolean) => {
  const pass = [] as T[];
  const fail = [] as T[];

  for (const item of arr) {
    if (predicate(item)) {
      pass.push(item);
    } else {
      fail.push(item);
    }
  }

  return [pass, fail];
};

export const plural = (count = 0, text: string, returnCount = true) => {
  const str = text + (count === 0 || count > 1 ? "s" : "");
  return returnCount ? count + " " + str : str;
};
