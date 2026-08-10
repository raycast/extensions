import { useFetch } from "@raycast/utils";

export function useAPI<T>({
  query,
  params = {},
  execute = true,
}: {
  query: string;
  params?: Record<string, string | undefined>;
  execute?: boolean;
}) {
  const url = new URL(`/persisted/val/${query}`, "https://esports-api.lolesports.com");

  url.searchParams.set("hl", "en-US");
  url.searchParams.set("sport", "val");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value ?? "");
  }

  return useFetch<T>(url.toString(), {
    headers: {
      accept: "application/json",
      // This is not a private key, it's a public key that is used to access the API.
      "x-api-key": "0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z",
    },
    execute,
  });
}
