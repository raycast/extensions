import type { LaunchProps } from "@raycast/api";
import StandardObjectCommand from "./components/StandardObjectCommand";

export default function Deals(props: LaunchProps<{ launchContext: { recordId?: string } }>) {
  return <StandardObjectCommand slug="deals" recordId={props.launchContext?.recordId} />;
}
