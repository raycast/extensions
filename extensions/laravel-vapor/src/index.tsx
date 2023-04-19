import { ActionPanel, Detail, List, Action } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getUser } from "./api/user";

export default function Command() {
  //   // call our getUser api call
  //  const {
  //     data: user,
  //     isLoading,
  //     mutate,
  //   } = useCachedPromise(getUser, [], { execute: true });

  //   console.log(user);

  return (
    <List>
      <List.Item
        icon="list-icon.png"
        title="Greeting"
        actions={
          <ActionPanel>
            <Action.Push title="Show Details" target={<Detail markdown="# Hey! 👋" />} />
          </ActionPanel>
        }
      />
    </List>
  );
}
