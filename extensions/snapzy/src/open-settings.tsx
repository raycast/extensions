import { LaunchProps } from "@raycast/api";
import { openSnapzy } from "./snapzy";

export default async function Command(props: LaunchProps<{ arguments: Arguments.OpenSettings }>) {
  const { tab } = props.arguments;
  await openSnapzy("settings", tab ? { tab } : undefined);
}
