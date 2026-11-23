import { Action, ActionPanel, List, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { SettingsAction } from "./components/selection-actions";
import { ExploreAction, SkyDetail } from "./components/sky-detail";
import { messageFor } from "./lib/command-ui";
import { getDefaultSelection } from "./lib/locations";

export default function CurrentSky() {
  const { data, error, isLoading, revalidate } = usePromise(getDefaultSelection, [{ forceNow: true }], {
    onError: () => undefined,
  });
  const warning = error ? messageFor(error) : undefined;
  if (data) return <SkyDetail selection={data} />;
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Current Sky">
      {!isLoading ? (
        <List.EmptyView
          title={warning ? "Couldn’t Load Default City" : "Choose a Default City"}
          description={warning ?? "Choose a city in Explore Sky or enter a city in extension settings."}
          icon={Icon.Pin}
          actions={
            <ActionPanel>
              <ExploreAction />
              <SettingsAction />
              {warning ? <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={revalidate} /> : null}
            </ActionPanel>
          }
        />
      ) : null}
    </List>
  );
}
