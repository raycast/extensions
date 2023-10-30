import { LaunchProps, confirmAlert, Alert } from "@raycast/api";
import { deleteUser } from "./utils/api";

export default async function DeleteUser(props: LaunchProps<{ arguments: Arguments.DeleteUser }>) {
  const { userName } = props.arguments;
  if (
    await confirmAlert({
      title: `Delete user ${userName}?`,
      message: "This action can not be undone.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    })
  ) {
    await deleteUser(userName);
  }
}
