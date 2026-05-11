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

export default (props: LaunchProps<{ arguments: Arguments.ShowUser }>) => {
  const { username: enteredUsername, id: enteredUserId } = props.arguments;

  if (enteredUsername && enteredUsername !== "") {
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
  } else if (enteredUserId && enteredUserId !== "") {
    const userId = Number(enteredUserId);
    if (!userId) {
      return <Detail markdown={"# 😔 No User Found...\nNo user found with that id."} />;
    }

    return <UserPage userId={userId} copyField="Username" />;
  } else {
    return <Detail markdown={`# ⚠️ Invalid Input\nPlease enter a valid Username or User ID.`} />;
  }
};
