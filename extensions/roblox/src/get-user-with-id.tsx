import { Detail, type LaunchProps } from "@raycast/api";
import { UserPage } from "./components/user-page";

export default (props: LaunchProps<{ arguments: Arguments.GetUserWithId }>) => {
  const { id: enteredUserId } = props.arguments;

  const userId = Number(enteredUserId);
  if (!userId) {
    return <Detail markdown={"# 😔 No User Found...\nNo user found with that id."} />;
  }

  return <UserPage userId={userId} copyField="Username" />;
};
