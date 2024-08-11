import { useCachedPromise } from "@raycast/utils";
import { CONTENTFUL } from "./lib/contentful";
import { Color, List } from "@raycast/api";
import { CONTENTFUL_SPACE } from "./lib/config";

export default function SearchUsers() {
  const { isLoading, data: users } = useCachedPromise(
    async () => {
      const response = await CONTENTFUL.user.getManyForSpace({
        spaceId: CONTENTFUL_SPACE,
      });
      return response.items;
    },
    [],
    {
      initialData: [],
      keepPreviousData: true,
    },
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search user">
      {users.map((user) => (
        <List.Item
          key={user.sys.id}
          icon={user.avatarUrl}
          title={`${user.firstName} ${user.lastName}`}
          subtitle={user.email}
          accessories={[
            { date: new Date(user.sys.updatedAt) },
            { tag: { value: "2FA", color: user["2faEnabled"] ? Color.Green : Color.Red } },
          ]}
        />
      ))}
    </List>
  );
}
