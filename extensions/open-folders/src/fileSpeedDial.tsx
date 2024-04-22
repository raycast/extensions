import { open, getPreferenceValues, Grid, ActionPanel, Action } from "@raycast/api";

interface Preferences {
  fileOne: string;
  fileTwo: string;
  fileThree: string;
  fileFour: string;
  fileFive: string;
  fileSix: string;
  fileSeven: string;
  fileEight: string;
}

const preferences = [
  getPreferenceValues<Preferences>().fileOne,
  getPreferenceValues<Preferences>().fileTwo,
  getPreferenceValues<Preferences>().fileThree,
  getPreferenceValues<Preferences>().fileFour,
  getPreferenceValues<Preferences>().fileFive,
  getPreferenceValues<Preferences>().fileSix,
  getPreferenceValues<Preferences>().fileSeven,
  getPreferenceValues<Preferences>().fileEight,
];

export default function Command() {
  const files: Map<number, string> = new Map<number, string>();

  preferences.forEach((element) => {
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
