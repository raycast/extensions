import { closeMainWindow, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

export async function ping(host: string): Promise<string> {
  closeMainWindow();
  await showToast({
    style: Toast.Style.Animated,
    title: "Pinging google.com",
    message: "Waiting for google.com",
  });

  try {
    console.log("start");

    const { stdout } = await execPromise(`/sbin/ping -c 1 ${host}`);

    const match = /time=(\d+(\.\d+)?)\sms/.exec(stdout);
    if (match && match[1]) {
      const time = parseFloat(match[1]);

      closeMainWindow();
      showToast({ title: time.toString() });

      return time.toString();
    }
    closeMainWindow();
    showFailureToast({ title: "Time out" });

    return "error";
  } catch (error) {
    closeMainWindow();
    showFailureToast({ title: error });
    return error as string;
  }
}
