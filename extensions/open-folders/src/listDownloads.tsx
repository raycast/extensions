import { ActionPanel, Action, List, Grid, getPreferenceValues } from "@raycast/api";
import { readdirSync, Dirent, statSync } from "fs";

const preferences = getPreferenceValues<Preferences.ListDownloads>();
const dir = preferences.downloadedFilesdir;
const layout = preferences.layout;

export default function Command() {
  const dirContents = readdirSync(dir, { withFileTypes: true }).sort((a, b) => {
    const createA: Date = statSync(`${a.path}/${a.name}`).birthtime;
    const createB: Date = statSync(`${b.path}/${b.name}`).birthtime;
    return createA < createB ? 1 : -1;
  });

  const dirFiles: Map<number, Dirent> = new Map<number, Dirent>();

  dirContents.forEach((item) => {
    if (item.name.charAt(0) != "." && item.isFile()) {
      dirFiles.set(dirFiles.size, item);
    }
  });

  if (layout == "List") {
    return (
      <List>
        {Array.from(dirFiles, ([key, value]) => (
          <List.Item
            key={key.valueOf()}
            icon={{ fileIcon: value.name }}
            title={value.name}
            actions={
              <ActionPanel>
                <Action.Open title={`Open ${value.name}`} target={`${value.path}/${value.name}`} />
              </ActionPanel>
            }
          />
        ))}
      </List>
    );
  } else {
    return (
      <Grid columns={Number.parseInt(layout)} inset={Grid.Inset.Small} aspectRatio="4/3">
        {Array.from(dirFiles, ([key, value]) => (
          <Grid.Item
            key={key.valueOf()}
            content={{ fileIcon: value.name }}
            title={value.name}
            actions={
              <ActionPanel>
                <Action.Open title={`Open ${value.name}`} target={`${value.path}/${value.name}`} />
              </ActionPanel>
            }
          />
        ))}
      </Grid>
    );
  }
}
