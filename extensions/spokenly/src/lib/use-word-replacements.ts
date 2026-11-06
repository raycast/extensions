import { getPreferenceValues } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { findCLI, SpokenlyCLI } from "./word-replacements";

async function connect(cliPath?: string) {
  const client = new SpokenlyCLI(await findCLI(cliPath));
  return { client, rules: await client.list() };
}

export function useSpokenly() {
  // Both commands declare the same cliPath preference.
  const { cliPath } = getPreferenceValues<
    Preferences.ManageWordReplacements | Preferences.AddWordReplacement
  >();
  const { data, error, isLoading, revalidate } = usePromise(
    connect,
    [cliPath],
    {
      onError: () => undefined,
    },
  );
  return {
    client: data?.client,
    rules: data?.rules ?? [],
    error: error
      ? error.message || "Could not connect to Spokenly."
      : undefined,
    isLoading,
    refresh: async () => {
      await revalidate();
    },
  };
}
