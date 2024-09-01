import { Clipboard, LaunchProps, showHUD } from "@raycast/api";
import { typeid } from "typeid-js";

export default async function generateTypeid(props: LaunchProps<{ arguments: Arguments.GenerateTypeid }>) {
  const { prefix } = props.arguments;
  const uuid = typeid(prefix).toString();

  await Clipboard.copy(uuid);

  await showHUD(`✅ Copied new UUID: ${uuid}`);
}
