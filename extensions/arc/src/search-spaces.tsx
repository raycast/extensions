import { Action, ActionPanel, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { OpenSpaceAction } from "./actions";
import { getSpaces } from "./arc";
import { getSpaceTitle } from "./utils";

export default function Command() {
  const { data, isLoading } = useCachedPromise(getSpaces);

  return (
    <List isLoading={isLoading}>
      {data?.map((space) => (
        <List.Item
          key={space.id}
          title={getSpaceTitle(space)}
          actions={
            <ActionPanel>
              <OpenSpaceAction space={space} />
              <ActionPanel.Section>
                <Action.CopyToClipboard
                  title="Copy Space Title"
                  content={getSpaceTitle(space)}
                  shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
