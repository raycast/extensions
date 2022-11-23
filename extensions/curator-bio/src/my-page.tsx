import { List } from "@raycast/api";
import { useMe } from "./lib/hooks";
import { useMemo } from "react";
import UserView from "./components/UserView";

export default function MyPage() {
  const { isLoading: isLoading, data: userResponse, error } = useMe();

  const user = useMemo(() => {
    return userResponse?.data;
  }, [userResponse]);

  return user ? <UserView user={user} /> : <List isLoading={!user || isLoading} />;
}
