import { List, Icon, ActionPanel, Action } from "@raycast/api";
import { CachedQueryClientProvider } from "../components/CachedQueryClientProvider";
import { trpc } from "@/utils/trpc.util";
import { useMe } from "../hooks/use-me.hook";
import { useAtom } from "jotai";
import { sessionTokenAtom } from "../states/session-token.state";
import { EditSpaceOneValueForm, KeyToEdit } from "./EditSpaceOneValueForm";
import { SpaceMembersView } from "./SpaceMembersView";
import { SpaceTagsView } from "./SpaceTagsView";

const EditAction = (props: { spaceId: string; keyToEdit: KeyToEdit; value: string; refetch: () => void }) => {
  const { spaceId, keyToEdit, value, refetch } = props;
  return (
    <Action.Push
      title="Edit"
      icon={Icon.Pencil}
      target={<EditSpaceOneValueForm spaceId={spaceId} keyToEdit={keyToEdit} value={value} />}
      onPop={refetch}
    />
  );
};

function Body(props: { spaceId: string }) {
  const { spaceId } = props;
  const { data, isLoading, refetch } = trpc.space.get.useQuery({ spaceId });
  const [sessionToken] = useAtom(sessionTokenAtom);
  const me = useMe(sessionToken);

  if (isLoading || !data || me.isLoading || !me.data) {
    return <List isLoading />;
  }

  const spaceInMe = me.data?.associatedSpaces.find((s) => s.id === spaceId);
  const image = data.image ? data.image : data.type === "TEAM" ? Icon.TwoPeople : Icon.Person;

  return (
    <List>
      <List.Item
        title="Name"
        subtitle={data.name}
        icon={Icon.Folder}
        actions={
          <ActionPanel>
            <EditAction spaceId={spaceId} keyToEdit="name" value={data.name} refetch={refetch} />
          </ActionPanel>
        }
      />
      <List.Item
        title="Image"
        subtitle={data.image || ""}
        icon={image}
        actions={
          <ActionPanel>
            <EditAction spaceId={spaceId} keyToEdit="image" value={data.image || ""} refetch={refetch} />
          </ActionPanel>
        }
      />
      <List.Item
        title="Description"
        subtitle={data.description || ""}
        icon={Icon.Document}
        actions={
          <ActionPanel>
            <EditAction spaceId={spaceId} keyToEdit="description" value={data.description || ""} refetch={refetch} />
          </ActionPanel>
        }
      />
      {data.type === "TEAM" && (
        <List.Item
          title="Members"
          subtitle={data._count.users.toString()}
          icon={Icon.TwoPeople}
          actions={
            <ActionPanel>
              <Action.Push
                title="Members"
                icon={Icon.TwoPeople}
                target={<SpaceMembersView spaceId={spaceId} />}
                onPop={refetch}
              />
            </ActionPanel>
          }
        />
      )}
      <List.Item
        title="Tags"
        subtitle={data._count.tags.toString()}
        icon={Icon.Tag}
        actions={
          <ActionPanel>
            <Action.Push title="Tags" icon={Icon.Tag} target={<SpaceTagsView spaceId={spaceId} />} onPop={refetch} />
          </ActionPanel>
        }
      />
      <List.Item title="Bookmarks" subtitle={data._count.bookmarks.toString()} icon={Icon.Bookmark} />

      <List.Section title="My Info in this space">
        <List.Item title="My Role" subtitle={spaceInMe?.myRole || ""} icon={Icon.CreditCard} />
        {/* WIP */}
        {/* <List.Item title="My NickName" subtitle={spaceInMe?.myNickname || me.data.name} icon={Icon.Brush} /> */}
        {/* <List.Item title="My Image" subtitle={spaceInMe?.myImage || ''} icon={spaceInMe?.myImage || Icon.Person} /> */}
      </List.Section>

      {/*
      TODO: delete space feature under construction
      <List.Item
        title={`Delete [${data.name}]`}
        accessories={[{ text: spaceInMe?.myRole === 'OWNER' ? `All users in this space will be unable to access space's bookmarks.` : 'Only owner can delete space', icon: Icon.Warning }]}
        icon={Icon.Trash}
      /> */}
    </List>
  );
}

export function SpaceDetailView(props: { spaceId: string }) {
  const { spaceId } = props;
  return (
    <CachedQueryClientProvider>
      <Body spaceId={spaceId} />
    </CachedQueryClientProvider>
  );
}
