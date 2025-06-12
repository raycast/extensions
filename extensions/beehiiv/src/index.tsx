import { ActionPanel, List, Action } from "@raycast/api";
import SubscriberCount from "./menubar-count-subscribers";
import PostList from "./search-posts";
import SubscriberSearch from "./search-subscribers";
import LastEmailStats from "./menubar-last-email";

export default function Command() {
  return (
    <List>
      <List.Item
        title="Subscriber Count"
        actions={
          <ActionPanel>
            <Action.Push title="Show Subscriber Count" target={<SubscriberCount />} />
          </ActionPanel>
        }
      />
      <List.Item
        title="Last Email Stats"
        actions={
          <ActionPanel>
            <Action.Push title="Show Last Email Stats" target={<LastEmailStats />} />
          </ActionPanel>
        }
      />
      <List.Item
        title="Posts"
        actions={
          <ActionPanel>
            <Action.Push title="Show Posts" target={<PostList />} />
          </ActionPanel>
        }
      />
      <List.Item
        title="Search Subscribers"
        actions={
          <ActionPanel>
            <Action.Push title="Search Subscribers" target={<SubscriberSearch />} />
          </ActionPanel>
        }
      />
    </List>
  );
}