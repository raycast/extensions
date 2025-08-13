import { showToast, Toast } from "@raycast/api";

export default async function Command() {
  await showToast({
    style: Toast.Style.Failure,
    title: "Raw command disabled",
    message: "Use the view commands from Montra: Home",
  });
}
