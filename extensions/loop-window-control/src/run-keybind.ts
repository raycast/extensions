import { LaunchProps } from "@raycast/api";
import { sendRequest } from "./lib/loop";
export default async function Command(props: LaunchProps<{ arguments: { name: string } }>) {
  await sendRequest({ kind: "keybind", value: props.arguments.name });
}
