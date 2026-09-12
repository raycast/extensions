import type { LaunchProps } from "@raycast/api";
import StandardObjectCommand from "./components/StandardObjectCommand";

export default function People(props: LaunchProps<{ launchContext: { recordId?: string } }>) {
  return <StandardObjectCommand slug="people" recordId={props.launchContext?.recordId} />;
}
