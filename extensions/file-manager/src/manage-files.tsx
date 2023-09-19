import { LaunchProps } from "@raycast/api";
import { getStartDirectory, Directory } from "./utils";

export default function Command(props: LaunchProps) {
  const path = props.launchContext?.path ?? getStartDirectory();

  return <Directory path={path} />;
}
