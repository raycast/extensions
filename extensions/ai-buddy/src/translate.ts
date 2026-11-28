import { LaunchProps } from "@raycast/api";
import { launchWithSelection } from "./launch";

export default async function Command(props: LaunchProps<{ arguments: Arguments.Translate }>) {
  await launchWithSelection("translate", props.arguments.text);
}
