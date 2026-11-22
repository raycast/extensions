import { LaunchProps, showHUD } from "@raycast/api";
import { viaRemo } from "./roku";

export default async function Command(
  props: LaunchProps<{ arguments: { title: string; app?: string } }>,
) {
  const { title, app } = props.arguments;
  const q = app ? `?on=${encodeURIComponent(app)}` : "";
  await viaRemo(`play/${encodeURIComponent(title)}${q}`);
  await showHUD(`Playing ${title}${app ? ` on ${app}` : ""}`);
}
