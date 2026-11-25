import { LaunchProps } from "@raycast/api";
import { LaunchForm } from "./components/launch-form";

export default function Command(props: LaunchProps<{ arguments: Arguments.LaunchBuild }>) {
  return <LaunchForm initialUrl={props.arguments.url || undefined} />;
}
