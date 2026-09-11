import { useEffect, useState } from "react";
import { getAccounts } from "../lib/timely-api";
import { getAccessToken } from "../lib/oauth";

export type TimelyState =
  | { status: "loading" }
  | { status: "ready"; accessToken: string; accountId: number }
  | { status: "error"; error: string };

export function useTimely(): TimelyState {
  const [state, setState] = useState<TimelyState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const accessToken = await getAccessToken();
        if (cancelled) return;

        const accounts = await getAccounts(accessToken);
        if (cancelled) return;

        if (!accounts.length) {
          setState({ status: "error", error: "No Timely accounts found." });
          return;
        }

        const accountId = accounts[0].id;
        setState({ status: "ready", accessToken, accountId });
      } catch (e) {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : String(e);
        setState({ status: "error", error: message });
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
