import { Action, ActionPanel, Detail, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import { getActiveTabContent } from "./lib/active-tab";
import { DisplayView } from "./lib/display-view";

type State = { kind: "resolving" } | { kind: "ready"; url: string; html: string } | { kind: "error"; message: string };

export default function DisplayTab() {
  const preferences = getPreferenceValues<Preferences>();
  const [state, setState] = useState<State>({ kind: "resolving" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const tab = await getActiveTabContent();
        if (!cancelled) setState({ kind: "ready", url: tab.url, html: tab.html });
      } catch (err) {
        if (!cancelled) {
          console.error("[web-to-md] could not read active tab:", err);
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
      <Detail
        markdown={`# Could not read active tab\n\n${state.message}`}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Error" content={state.message} />
          </ActionPanel>
        }
      />
    );
  }

  return <DisplayView url={state.url} html={state.html} preferences={preferences} />;
}
