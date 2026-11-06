import { getPreferenceValues } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { findCLI, Replacement, SpokenlyCLI } from "./replacements";

export function useSpokenly() {
  const { cliPath } = getPreferenceValues<{ cliPath?: string }>();
  const [client, setClient] = useState<SpokenlyCLI>();
  const [rules, setRules] = useState<Replacement[]>([]);
  const [error, setError] = useState<string>();
  const [isLoading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const cli = new SpokenlyCLI(await findCLI(cliPath));
      setRules(await cli.list());
      setClient(cli);
      setError(undefined);
    } catch (failure) {
      setClient(undefined);
      setRules([]);
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not connect to Spokenly.",
      );
    } finally {
      setLoading(false);
    }
  }, [cliPath]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return { client, rules, error, isLoading, refresh };
}
