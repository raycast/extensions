import { showToast, Toast, getPreferenceValues, LaunchProps } from "@raycast/api";
import { login } from "./utils";

export default async function Command(props: LaunchProps<{ arguments: { otp: string } }>) {
  const args = props.arguments;
  const prefs = getPreferenceValues();

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Logging in...",
  });

  try {
    login(prefs.username, prefs.password, prefs.proxy, args.otp);

    toast.style = Toast.Style.Success;
    toast.title = "Logged in !";
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to login !";
    toast.message = err instanceof Error ? err.message : String(err);
  }
}
