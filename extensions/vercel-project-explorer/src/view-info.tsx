import isValidToken from "./utils/is-valid-token";
import useVercel from "./hooks/use-vercel-info";
import { List } from "@raycast/api";
import UserListSection from "./pages/view-info/user-info-section";

function Main() {
  isValidToken();

  const { user } = useVercel();
  return (
    <List isLoading={!user} navigationTitle="User Information">
      {user && <UserListSection user={user} />}
    </List>
  );
}

export default Main;
