import { LaunchProps, Toast, showToast } from "@raycast/api";
import { createBackup } from "./utils/api";

export default async function CreateBackup(props: LaunchProps<{ arguments: Arguments.CreateBackup }>) {
  const { websiteToBeBacked } = props.arguments;

  const response = await createBackup({ websiteToBeBacked });

  if (response.error_message === "None")
    await showToast(Toast.Style.Success, "SUCCESS", `Submitted backup successfully`);
}
