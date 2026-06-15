import { LaunchProps, showHUD } from "@raycast/api";
import { monocle } from "./monocle";

export default async function main(props: LaunchProps<{ arguments: Arguments.SetTintHex }>) {
  const raw = props.arguments.hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) {
    await showHUD("Enter a 6-digit hex color (e.g. FF6B6B)");
    return;
  }
  await monocle(`tint/color/${raw}`, `Tint #${raw.toUpperCase()}`);
}
