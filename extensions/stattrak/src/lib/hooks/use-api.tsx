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
  const url = new URL(query, "https://api.stattrak.gg");

  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value ?? "");
  }

  return useFetch<T>(url.toString(), {
    headers: {
      accept: "application/json",
    },
    execute,
  });
}
