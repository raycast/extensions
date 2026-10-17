import type { LaunchProps } from "@raycast/api";
import StandardObjectCommand from "./components/StandardObjectCommand";

export default function Companies(props: LaunchProps<{ launchContext: { recordId?: string } }>) {
  return <StandardObjectCommand slug="companies" recordId={props.launchContext?.recordId} />;
}
