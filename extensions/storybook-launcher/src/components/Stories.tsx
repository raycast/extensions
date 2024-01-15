import { ActionPanel, List, Action, Icon } from "@raycast/api";
import { SBComponent } from "../types";

export function Stories({ component, url }: { component: SBComponent; url: string }) {
  return (
    <List navigationTitle={component.name}>
      {component.stories.map((story) => (
        <List.Item
          key={story.id}
          title={story.name}
          icon={Icon.Bookmark}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={`${url}/?path=/story/${story.id}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
