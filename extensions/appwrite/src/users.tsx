import { getAvatarIcon, useCachedPromise } from "@raycast/utils";
import { List } from "@raycast/api";
import { useContext } from "react";
import { SDKContext } from "./sdk";

export default function Users() {
  const sdks = useContext(SDKContext);
  const { isLoading, data: users } = useCachedPromise(
    async () => {
      const res = await sdks.users.list();
      return res.users;
    },
    [],
    {
      initialData: [],
    },
  );

  return (
    <List isLoading={isLoading}>
      {users.map((user) => (
        <List.Item
          key={user.$id}
          icon={getAvatarIcon(user.name)}
          title={user.name}
          subtitle={user.targets[0].identifier}
          accessories={[{ tag: user.emailVerification ? "Verified" : "Unverified" }]}
        />
      ))}
    </List>
  );
}
