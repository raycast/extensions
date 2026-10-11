import { LaunchProps, showHUD, showToast, Toast } from "@raycast/api";
import { api } from "./api";

export default async function AddToToday(props: LaunchProps<{ arguments: Arguments.AddToToday }>) {
  const text = props.arguments.text.trim();
  if (!text) {
    await showToast({ style: Toast.Style.Failure, title: "Enter some text" });
    return;
  }
  try {
    await api("/things", { method: "POST", body: JSON.stringify({ list: "today", text }) });
    await showHUD("Added to Today");
  } catch (e) {
    await showToast({ style: Toast.Style.Failure, title: "Couldn't add", message: String(e) });
  }
}
