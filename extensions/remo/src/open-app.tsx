import { Action, ActionPanel, Grid, Icon, showHUD } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { apps, launch } from "./roku";

export default function Command() {
  const { data, isLoading } = usePromise(apps);
  return (
    <Grid
      columns={4}
      aspectRatio="4/3"
      fit={Grid.Fit.Fill}
      isLoading={isLoading}
      searchBarPlaceholder={`Open on ${data?.device.name ?? "TV"}`}
    >
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
                  await launch(a.id);
                  await showHUD(`Opening ${a.name}`);
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
