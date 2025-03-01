import { trpc } from "@/utils/trpc.util";
import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { CachedQueryClientProvider } from "../components/CachedQueryClientProvider";
import { SpaceTagItemActionPanel } from "../components/SpaceTagItemActionPanel";
import { NewTagForm } from "./NewTagForm";

export const Body = (props: { spaceId: string }) => {
  const { spaceId } = props;
  const { data, refetch, isLoading, isFetching } = trpc.tag.list.useQuery({ spaceIds: [spaceId] });

  if (isLoading || !data) {
    return <List isLoading />;
  }

  if (data.length === 0) {
    return (
      <List isLoading={isFetching}>
        <List.EmptyView
          title="No tags"
          description="Create a new tag"
          icon={Icon.Plus}
          actions={
            <ActionPanel>
              <Action.Push
                title={"Create New Tag"}
                icon={Icon.Plus}
                shortcut={Keyboard.Shortcut.Common.New}
                target={<NewTagForm spaceId={spaceId} />}
                onPop={() => refetch()}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isFetching}>
      {data?.map((tag) => (
        <List.Item
          key={tag.name}
          title={tag.name}
          icon={tag.space.image || ""}
          actions={<SpaceTagItemActionPanel spaceId={spaceId} tagName={tag.name} refetch={refetch} />}
        />
      ))}
    </List>
  );
};

export function SpaceTagsView(props: { spaceId: string }) {
  const { spaceId } = props;
  return (
    <CachedQueryClientProvider>
      <Body spaceId={spaceId} />
    </CachedQueryClientProvider>
  );
}
