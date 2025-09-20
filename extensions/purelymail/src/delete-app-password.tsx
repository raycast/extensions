import { Alert, confirmAlert, LaunchProps } from "@raycast/api";
import { deleteAppPassword } from "./utils/api";

export default async function DeleteAppPassword(props: LaunchProps<{ arguments: Arguments.DeleteAppPassword }>) {
  const { userName, appPassword } = props.arguments;
  if (
    await confirmAlert({
      title: `Delete App Password?`,
      message: `This action can not be undone. Your users will no longer be able to authenticate using this key.`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    })
  ) {
    await deleteAppPassword({ userName, appPassword });
  }
}
