import { getPreferenceValues, showToast, Toast, closeMainWindow } from "@raycast/api";
import { exec } from "child_process";

interface Preferences {
  server1: string;
  server2: string;
}

function connectToServer(server: string) {
  return new Promise((resolve, reject) => {
    exec(`osascript -e 'mount volume "${server}"'`, (error, stdout, stderr) => {
      if (error) {
        reject(stderr || error.message);
      } else {
        resolve(stdout);
      }
    });
  });
}

export default async function Command() {
  const { server1, server2 } = getPreferenceValues<Preferences>();

  try {
    // Close the Raycast main window immediately
    await closeMainWindow({ clearRootSearch: true });

    // Display an initial animated toast while connecting
    await showToast({ style: Toast.Style.Animated, title: "Connecting to servers..." });

    // Attempt to connect to both servers
    await connectToServer(server1);
    await connectToServer(server2);

    // Show success message after connecting
    await showToast({ style: Toast.Style.Success, title: "Connected to both servers!" });
  } catch (error) {
    // Show failure message if connection fails
    await showToast({
      style: Toast.Style.Failure,
      title: "Connection failed",
      message: String(error),
    });
  }
}
