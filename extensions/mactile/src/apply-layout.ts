import { LaunchProps } from "@raycast/api";
import { runBestMatchingLayout } from "./run-layout";

type ApplyLayoutArguments = {
  query: string;
};

export default async function Command(props: LaunchProps<{ arguments: ApplyLayoutArguments }>) {
  await runBestMatchingLayout(props.arguments.query);
}
