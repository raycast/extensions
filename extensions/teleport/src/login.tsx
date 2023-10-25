import { environment, showToast, Toast, getPreferenceValues, LaunchProps } from "@raycast/api";
import { promisify } from "util";
import { exec } from "child_process";
import { getEnv } from "./utils";

export default async function Command(props: LaunchProps<{ arguments: { otp: string } }>) {
  const args = props.arguments;
  const prefs = getPreferenceValues();

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Logging in...",
  });

  const env = getEnv();

  const execp = promisify(exec);

  try {
    const output = await execp(
      `sh ${environment.assetsPath}/scripts/teleport-login.sh ${prefs.username} ${prefs.password} ${prefs.proxy} ${args.otp}`,
      { env }
    );

    if (output.stdout.includes("ERROR")) {
      throw new Error(output.stdout);
    }

    toast.style = Toast.Style.Success;
    toast.title = "Logged in !";
    toast.message = output.stdout;
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to login !";
    if (err instanceof Error) {
      toast.message = err.message;
    }
  }
}
