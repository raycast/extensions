import { ActionPanel, Action, List, Grid, getPreferenceValues } from "@raycast/api";
import { readdirSync } from "fs";

const preferences = getPreferenceValues<Preferences.ListFolders>();

const dir = preferences.homedir;
const layout = preferences.layout;

export default function Command() {
  if (layout == "List") {
    return (
      <List>
        {readdirSync(dir, { withFileTypes: true }).map(function (item) {
          return item.name.charAt(0) != "." && item.isDirectory() ? (
            <List.Item
              key={item.name}
              icon={{ fileIcon: `${item.path}/${item.name}` }}
              title={item.name}
              actions={
                <ActionPanel>
                  <Action.Open title={`Open ${item.name}`} target={`${item.path}/${item.name}`} />
                </ActionPanel>
              }
            />
          ) : null;
        })}
      </List>
    );
  } else {
    return (
      <Grid columns={Number.parseInt(layout)} inset={Grid.Inset.Small} aspectRatio="4/3">
        {readdirSync(dir, { withFileTypes: true }).map(function (item) {
          return item.name.charAt(0) != "." && item.isDirectory() ? (
            <Grid.Item
              key={item.name}
              content={{ fileIcon: `${item.path}/${item.name}` }}
              title={item.name}
              actions={
                <ActionPanel>
                  <Action.Open title={`Open ${item.name}`} target={`${item.path}/${item.name}`} />
                </ActionPanel>
              }
            />
          ) : null;
        })}
      </Grid>
    );
  }
}
