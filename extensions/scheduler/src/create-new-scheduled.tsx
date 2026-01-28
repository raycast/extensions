import { ManageScheduledCommand } from "./ManageScheduledCommand";
import type { LaunchProps } from "@raycast/api";
import type { FormValues } from "./types";

export default function CreateNewScheduledCommand(props: LaunchProps<{ draftValues: Partial<FormValues> }>) {
  const { draftValues } = props;
  return <ManageScheduledCommand draftValues={draftValues} />;
}
