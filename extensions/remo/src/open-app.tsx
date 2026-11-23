import {
  Action,
  ActionPanel,
  Grid,
  Icon,
  openExtensionPreferences,
  showHUD,
} from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { apps, launch } from "./roku";

export default function Command() {
  const { data, isLoading, error, revalidate } = usePromise(apps);
  return (
    <Grid
      columns={4}
      aspectRatio="4/3"
      fit={Grid.Fit.Fill}
      isLoading={isLoading}
      searchBarPlaceholder={`Open on ${data?.device.name ?? "TV"}`}
    >
      {error ? (
        <Grid.EmptyView
          icon={Icon.Warning}
          title="Couldn’t reach the TV"
          description={error.message}
          actions={
            <ActionPanel>
              <Action
                title="Try Again"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
              />
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      ) : null}
      {data?.apps.map((a) => (
        <Grid.Item
          key={a.id}
          title={a.name}
          content={{
            source: `http://${data.device.host}/query/icon/${a.id}`,
            fallback: Icon.AppWindow,
          }}
          actions={
            <ActionPanel>
              <Action
                title={`Open ${a.name}`}
                icon={Icon.Play}
                onAction={async () => {
                  try {
                    await launch(a.id);
                    await showHUD(`Opening ${a.name}`);
                  } catch (e) {
                    await showFailureToast(e, {
                      title: `Couldn’t open ${a.name}`,
                    });
                  }
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
