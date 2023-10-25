import { environment, showToast, Toast } from "@raycast/api";
import { promisify } from "util";
import { exec } from "child_process";
import { getEnv } from "./utils";

export default async function Command() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Logging out...",
  });

  const env = getEnv();

  const execp = promisify(exec);

  try {
    const output = await execp(`sh ${environment.assetsPath}/scripts/teleport-logout.sh`, { env });

    toast.style = Toast.Style.Success;
    toast.title = "Logged out !";
    toast.message = output.stdout;
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to logout !";
    if (err instanceof Error) {
      toast.message = err.message;
    }
  }
}
