import { open, getPreferenceValues, Grid, ActionPanel, Action } from "@raycast/api";

const preferences = getPreferenceValues<Preferences.FileSpeedDial>();

const fileLocations = [
  preferences.fileOne,
  preferences.fileTwo,
  preferences.fileThree,
  preferences.fileFour,
  preferences.fileFive,
  preferences.fileSix,
  preferences.fileSeven,
  preferences.fileEight,
];

export default function Command() {
  const files: Map<number, string> = new Map<number, string>();

  fileLocations.forEach((element) => {
    if (element != null && element != "") {
      files.set(files.size, element);
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
        if (number != null && number >= 0 && number < 9) {
          open(files.get(number - 1)!);
        }
      }}
    >
      {Array.from(files, ([key, value]) => (
        <Grid.Item
          key={key.valueOf()}
          title={`| ${key + 1} | value.substring(value.lastIndexOf('/') + 1, value.length)`}
          content={
            //source: `https://api.iconify.design/material-symbols-light/counter-${key + 1}.svg`
            { fileIcon: value }
          }
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
