import { List } from "@raycast/api";
import { useMe } from "./lib/hooks";
import { useMemo } from "react";
import UserView from "./components/UserView";
import ErrorView from "./components/ErrorView";

export default function MyPage() {
  const { isLoading: isLoading, data: userResponse, error } = useMe();

  const user = useMemo(() => {
    return userResponse?.data;
  }, [userResponse]);

  if (error) {
    return <ErrorView error={error} />;
  } else {
    return user ? <UserView user={user} /> : <List isLoading={isLoading} />;
  }
}
