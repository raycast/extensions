import { showToast, Toast } from "@raycast/api";
import { moveTo } from "./desk";

export default async function moveToCustom(props: { arguments: Arguments.MoveToCustom }) {
  const height = Number(props.arguments.height.replace(",", "."));
  if (!Number.isFinite(height) || height <= 0) {
    await showToast({ style: Toast.Style.Failure, title: "Enter a height in cm, for example 80" });
    return;
  }
  await moveTo(height);
}
