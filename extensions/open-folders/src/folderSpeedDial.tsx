import { open, getPreferenceValues, Grid, ActionPanel, Action } from "@raycast/api";

interface Preferences {
  dirOne: string;
  dirTwo: string;
  dirThree: string;
  dirFour: string;
  dirFive: string;
  dirSix: string;
  dirSeven: string;
  dirEight: string;
}

const preferences = [
  getPreferenceValues<Preferences>().dirOne,
  getPreferenceValues<Preferences>().dirTwo,
  getPreferenceValues<Preferences>().dirThree,
  getPreferenceValues<Preferences>().dirFour,
  getPreferenceValues<Preferences>().dirFive,
  getPreferenceValues<Preferences>().dirSix,
  getPreferenceValues<Preferences>().dirSeven,
  getPreferenceValues<Preferences>().dirEight,
];

export default function Command() {
  const directories: Map<number, string> = new Map<number, string>();

  preferences.forEach((element) => {
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
        if (number != null && number >= 0 && number < 9) {
          open(directories.get(number - 1)!);
        }
      }}
    >
      {Array.from(directories, ([key, value]) => (
        <Grid.Item
          key={key.valueOf()}
          title={`| ${key} | value.substring(value.lastIndexOf('/') + 1, value.length)`}
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
