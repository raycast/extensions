import { Action, ActionPanel, Detail, Grid, useNavigation } from "@raycast/api";
import { RadarImage } from "../types/types";

export function RadarGridLayout(props: { isLoading: boolean; radars: RadarImage[] }) {
  const { push } = useNavigation();
  const { isLoading, radars } = props;

  return (
    <Grid itemSize={Grid.ItemSize.Large} isLoading={isLoading} searchBarPlaceholder={"Search rain radar location"}>
      <Grid.EmptyView
        icon={{ source: { light: "rain-radar-icon.png", dark: "rain-radar-icon.png" } }}
        title={"No radars found..."}
        description={""}
      />
      <Grid.Section title={"Available Radars"}>
        {radars.map((radar, index) => {
          return (
            <Grid.Item
              id={index + radar.url}
              key={index + radar.url}
              content={{
                value: radar.url,
                tooltip: radar.location,
              }}
              title={radar.location}
              actions={
                <ActionPanel>
                  <ActionPanel.Item
                    title={`Enlarge radar view`}
                    onAction={() => push(<WallpaperView location={radar.location} image={radar.url} />)}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </Grid.Section>
    </Grid>
  );
}

function WallpaperView(props: { image: string; location: string }) {
  const { image, location } = props;

  return (
    <Detail
      markdown={`![${location}](${image})`}
      actions={
        <ActionPanel title="Radar">
          <Action.OpenInBrowser url={`${image}`} />
        </ActionPanel>
      }
    />
  );
}
