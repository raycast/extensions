import { Detail, type LaunchProps } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { UserPage } from "./components/user-page";

type UserResult = {
  requestedUsername: string;
  hasVerifiedBadge: boolean;
  id: number;
  name: string;
  displayName: string;
};
type Result = {
  data: UserResult[];
};

export default (props: LaunchProps<{ arguments: Arguments.GetUserWithUsername }>) => {
  const { username: enteredUsername } = props.arguments;

  const body = {
    usernames: [enteredUsername],
    excludeBannedUsers: false,
  };

  const { data, isLoading } = useFetch<Result>("https://users.roblox.com/v1/usernames/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (isLoading) {
    return <Detail isLoading={isLoading} markdown={"Loading..."} />;
  }

  if (!data || data.data.length === 0) {
    return <Detail markdown={"# 😔 No User Found...\nNo user found with that username."} />;
  }

  const { id: userId } = data.data[0];

  return <UserPage userId={userId} copyField="UserID" />;
};
