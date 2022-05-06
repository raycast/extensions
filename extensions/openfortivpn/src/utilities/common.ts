import { Alert, confirmAlert, open, showHUD } from "@raycast/api";

export async function checkErrors(stderr: Error) {
  if (stderr.message.includes("sudo: a terminal is required to read the password")) {
    const alertOptions: Alert.Options = {
      title: "Can't Use Sudo",
      message:
        "It seems your user can't use sudo without a password. Please turn off using sudo in the extension preferences or change your sudo configuration.",
      primaryAction: {
        title: "Learn More",
      },
      dismissAction: {
        title: "Close Raycast",
      },
    };
    if (await confirmAlert(alertOptions)) {
      await open("https://github.com/raycast/extensions/tree/main/extensions/openfortivpn#readme");
    }
  } else {
    console.log(stderr.message);
    await showHUD("Connection problem");
  }
}
