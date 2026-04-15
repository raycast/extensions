import { environment, showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import path from "path";
import { promisify } from "util";

const execPromise = promisify(exec);

export default async function Command() {
  const soundPath = path.join(environment.assetsPath, "faah.mp3");

  await showToast({
    style: Toast.Style.Animated,
    title: "Faah!",
  });

  try {
    await execPromise(`afplay "${soundPath}"`);
    await showToast({
      style: Toast.Style.Success,
      title: "Faah!",
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error playing sound",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
