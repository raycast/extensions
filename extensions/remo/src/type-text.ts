import { LaunchProps } from "@raycast/api";
import { run, typeText } from "./roku";

export default async function Command(
  props: LaunchProps<{ arguments: { text: string } }>,
) {
  await run("Typed on TV", () => typeText(props.arguments.text));
}
