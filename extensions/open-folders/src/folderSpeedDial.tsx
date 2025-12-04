import { Action, ActionPanel, Grid, getPreferenceValues, open } from "@raycast/api";

const preferences = getPreferenceValues<Preferences.FolderSpeedDial>();

const folders = [
  preferences.dirOne,
  preferences.dirTwo,
  preferences.dirThree,
  preferences.dirFour,
  preferences.dirFive,
  preferences.dirSix,
  preferences.dirSeven,
  preferences.dirEight,
];

export default function Command() {
  const directories: Map<number, string> = new Map<number, string>();

  folders.forEach((element) => {
    if (element != null && element != "") {
      directories.set(directories.size, element);
    }
  });

  return (
    <Grid
      columns={4}
      inset={Grid.Inset.Small}
      aspectRatio="4/3"
      filtering={false}
      onSearchTextChange={(text) => {
        const number: number = Number.parseInt(text);
        if (number != null && number > 0 && number < 9) {
          const path = directories.get(number - 1);
          if (path) {
            open(path);
          }
        }
      }}
    >
      {Array.from(directories, ([key, value]) => (
        <Grid.Item
          key={key.valueOf()}
          title={`| ${key + 1} | ${value.substring(value.lastIndexOf("/") + 1, value.length)}`}
          content={{ fileIcon: value }}
          actions={
            <ActionPanel>
              <Action.Open title={`Open ${value.substring(value.lastIndexOf("/") + 1, value.length)}`} target={value} />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
