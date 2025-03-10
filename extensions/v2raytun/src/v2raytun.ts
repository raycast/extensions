import { showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { exec } from "child_process";

export default function main() {
  try {
    exec('open "v2raytun://connect"', (error, response) => {
      if (error) {
        showToast({
          title: "Connection Error",
          message: error.message,
        });
        return;
      }
      showToast({
        title: "VPN Connected",
        message: response,
      });
    });
  } catch (error) {
    if (error instanceof Error) {
      showFailureToast("Connection Error", error);
      return;
    }
  }
}
