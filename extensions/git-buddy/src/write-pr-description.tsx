import { LaunchProps } from "@raycast/api";
import { WritePRDescription } from "./_components/write-pr-description/WritePRDescription";

interface LaunchContext {
  baseBranch: string;
}

export default function Command(props: LaunchProps<{ launchContext: LaunchContext }>) {
  return <WritePRDescription baseBranch={props.launchContext?.baseBranch} />;
}
