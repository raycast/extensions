import { getPreferenceValues } from "@raycast/api";
import { execSync } from "child_process";

export function listScreenInfo() {
  const PATH = getPreferenceValues<Preferences>().path;
  const stout = execSync(`zsh -l -c 'PATH=${PATH} displayplacer list'`);
  const result = stout
    .toString()
    .split("\n")
    .reduce<DisplayPlacerList>(
      (data, line) => {
        if (line.startsWith("displayplacer ")) {
          data.currentCommand = line;
        }
        return data;
      },
      { currentCommand: null }
    );

  console.log(result);

  return result;
}

export function switchSettings(favorite: Favorite) {
  const PATH = getPreferenceValues<Preferences>().path;
  if (!favorite.command) return;
  try {
    execSync(`zsh -l -c 'PATH=${PATH}:/opt/homebrew/bin ${favorite.command}'`);
  } catch (e: any) {
    let error = true;
    const lines = e.toString().split("\n");
    lines.forEach((line: string) => {
      console.log(line);
      if (line.search(/skipping changes for that screen/)) {
        error = false;
      }
    });

    if (error) throw new Error("Unknown");
  }
}
