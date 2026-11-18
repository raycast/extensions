import { Action, ActionPanel, List, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { SettingsAction } from "./components/selection-actions";
import { ExploreAction, SkyDetail } from "./components/sky-detail";
import { messageFor } from "./lib/command-ui";
import { getDefaultSelection, SkySelection } from "./lib/locations";

type View = { kind: "loading" } | { kind: "empty"; warning?: string } | { kind: "ready"; selection: SkySelection };

export default function CurrentSky() {
  const [view, setView] = useState<View>({ kind: "loading" });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    getDefaultSelection({ forceNow: true }).then(
      (selection) => {
        if (active) setView(selection ? { kind: "ready", selection } : { kind: "empty" });
      },
      (error: unknown) => {
        if (active) setView({ kind: "empty", warning: messageFor(error) });
      },
    );
    return () => {
      active = false;
    };
  }, [revision]);

  if (view.kind === "ready") return <SkyDetail selection={view.selection} />;
  return (
    <List isLoading={view.kind === "loading"} searchBarPlaceholder="Current Sky">
      {view.kind === "empty" ? (
        <List.EmptyView
          title={view.warning ? "Couldn’t Load Default City" : "Choose a Default City"}
          description={view.warning ?? "Choose a city in Explore Sky or enter a city in extension settings."}
          icon={Icon.Pin}
          actions={
            <ActionPanel>
              <ExploreAction />
              <SettingsAction />
              {view.warning ? (
                <Action
                  title="Try Again"
                  icon={Icon.ArrowClockwise}
                  onAction={() => {
                    setView({ kind: "loading" });
                    setRevision((value) => value + 1);
                  }}
                />
              ) : null}
            </ActionPanel>
          }
        />
      ) : null}
    </List>
  );
}
