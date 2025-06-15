import { open, getPreferenceValues } from "@raycast/api";
import { readdirSync, statSync } from "fs";

const downloadsdir = getPreferenceValues<Preferences.MostRecent>().downloadsdir;

export default function Command() {
  const dirContents = readdirSync(downloadsdir, { withFileTypes: true }).sort((a, b) => {
    const createA: Date = statSync(`${a.path}/${a.name}`).birthtime;
    const createB: Date = statSync(`${b.path}/${b.name}`).birthtime;
    return createA < createB ? 1 : -1;
  });

  return open(`${dirContents[0].path}/${dirContents[0].name}`);
}
