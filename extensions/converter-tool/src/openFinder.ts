import { getPreferenceValues, open } from "@raycast/api";
import { homedir } from "os";

export default async function Command() {
  let directory = getPreferenceValues().finderDirectory;
  if (directory === undefined) {
    directory = `${homedir()}/Downloads`;
  }
  await open(directory);
}
