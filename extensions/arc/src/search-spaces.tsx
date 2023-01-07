import { ActionPanel, List } from "@raycast/api";
import { OpenSpaceAction } from "./actions";
import { useSpaces } from "./spaces";

export default function Command() {
  const { data, isLoading } = useSpaces();

  return (
    <List isLoading={isLoading}>
      {data?.map((space) => (
        <List.Item
          key={space.id}
          title={space.title || `Space ${space.id}`}
          actions={
            <ActionPanel>
              <OpenSpaceAction spaceId={space.id} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
