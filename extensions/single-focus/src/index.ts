import { showHUD, getFrontmostApplication, Alert, confirmAlert, Icon, Color } from "@raycast/api";
import { quitButFront } from "swift:../QuitAllButFocused";

export default async function main() {
  const frontMostApp = await getFrontmostApplication();

  const options: Alert.Options = {
    title: "Quit all apps but " + frontMostApp.name,
    icon: { source: Icon.Warning, tintColor: Color.Red },
    message: "You will not be able to undo this action.",
    rememberUserChoice: true,
    primaryAction: {
      title: "Do It",
      style: Alert.ActionStyle.Destructive,
    },
  };

  if (await confirmAlert(options)) {
    await quitButFront();
    await showHUD("Closing all apps except: " + frontMostApp.name);
  } else {
    await showHUD("Canceled");
  }
}
