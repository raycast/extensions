import { LaunchProps } from "@raycast/api";
import { SyncFoldersForm } from "./components/SyncFoldersForm";
import { SyncFoldersFormValues } from "./types";

export default function Command(props: LaunchProps<{ draftValues: SyncFoldersFormValues }>) {
  const { draftValues } = props;

  return <SyncFoldersForm draftValues={draftValues} />;
}
