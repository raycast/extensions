import type { LaunchProps } from "@raycast/api";
import CreateRecordCommand from "./components/CreateRecordCommand";

export default function Command(props: LaunchProps<{ draftValues: Record<string, unknown> }>) {
  return <CreateRecordCommand slug="people" draftValues={props.draftValues} />;
}
