import { LaunchProps } from "@raycast/api";
import { getStartDirectory } from "./utils";
import { Directory } from "./components/directory";

export default function Command(props: LaunchProps) {
  const path = props.launchContext?.path ?? getStartDirectory();

  return <Directory path={path} ignores={[]} initial />;
}
