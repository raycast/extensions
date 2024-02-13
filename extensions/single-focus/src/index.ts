import { showHUD, getFrontmostApplication, Alert, confirmAlert } from "@raycast/api";
import { quitButFront } from "swift:../QuitAllButFocused";

export default async function main() {
  const frontMostApp = await getFrontmostApplication();

  const options: Alert.Options = {
    title: "Quit all apps but " + frontMostApp.name,
    message: "You will not be able to undo this action.",
    rememberUserChoice: true,
  };

  if (await confirmAlert(options)) {
    await quitButFront();
    await showHUD("Closing all apps except: " + frontMostApp.name);
  } else {
    await showHUD("Canceled");
  }
}
