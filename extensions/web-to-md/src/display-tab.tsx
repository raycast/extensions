import { Detail, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import { getActiveTab } from "./lib/active-tab";
import { DisplayView } from "./lib/display-view";
import type { CommandPreferences } from "./lib/types";

type State =
  | { kind: "resolving" }
  | { kind: "ready"; url: string }
  | { kind: "error"; message: string };

export default function DisplayTab() {
  const preferences = getPreferenceValues<CommandPreferences>();
  const [state, setState] = useState<State>({ kind: "resolving" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const tab = await getActiveTab();
        if (!cancelled) setState({ kind: "ready", url: tab.url });
      } catch (err) {
        if (!cancelled) {
          setState({
            kind: "error",
            message: err instanceof Error ? err.message : String(err),
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.kind === "resolving") {
    return <Detail isLoading markdown="# Reading active tab…" />;
  }

  if (state.kind === "error") {
    return (
      <Detail markdown={`# Could not read active tab\n\n${state.message}`} />
    );
  }

  return <DisplayView url={state.url} preferences={preferences} />;
}
