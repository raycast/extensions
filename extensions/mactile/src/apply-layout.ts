import { LaunchProps } from "@raycast/api";
import { runBestMatchingLayout } from "./run-layout";

export default async function Command(props: LaunchProps<{ arguments: Arguments.ApplyLayout }>) {
  await runBestMatchingLayout(props.arguments.query);
}
