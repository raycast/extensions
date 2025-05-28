import { List, Icon, ActionPanel, Action, Color } from "@raycast/api";
import { CachedQueryClientProvider } from "../components/CachedQueryClientProvider";
import { trpc } from "@/utils/trpc.util";
import { useMe } from "../hooks/use-me.hook";
import { EditSpaceOneValueForm, KeyToEdit } from "./EditSpaceOneValueForm";
import { SpaceMembersView } from "./SpaceMembersView";
import { SpaceTagsView } from "./SpaceTagsView";
import { useEnabledSpaces } from "../hooks/use-enabled-spaces.hook";
import { SpaceMemberAuthPoliciesView } from "./SpaceMemberAuthPoliciesView";
import { SpaceAuthForm } from "./SpaceAuthForm";

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
  const { data, isLoading, refetch: refetchSpace } = trpc.space.get.useQuery({ spaceId });
  const me = useMe();
  const { enabledSpaceIds, confirmAndToggleEnableDisableSpace: toggleEnableDisable } = useEnabledSpaces();

  if (isLoading || !data || !me.data || !enabledSpaceIds) {
    return <List isLoading />;
  }

  const spaceInMe = me.data?.associatedSpaces.find((s) => s.id === spaceId);
  const image = data.image ? data.image : data.type === "TEAM" ? Icon.TwoPeople : Icon.Person;

  const refetch = () => {
    refetchSpace();
    me.refetch();
  };

  return (
    <List isLoading={me.isFetching}>
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
      <List.Item title="Bookmarks" subtitle={data._count.bookmarks.toString()} icon={Icon.Bookmark} />
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

      {data.type === "TEAM" && (
        <List.Item
          title="Member Auth Policies"
          subtitle={data._count.memberAuthPolicies === 0 ? undefined : data._count.memberAuthPolicies.toString()}
          accessories={
            data._count.memberAuthPolicies === 0
              ? [{ tag: { value: "All users are allowed", color: Color.Orange } }]
              : []
          }
          icon={Icon.Lock}
          actions={
            <ActionPanel>
              <Action.Push
                title="Member Auth Policies"
                icon={Icon.Lock}
                target={<SpaceMemberAuthPoliciesView spaceId={spaceId} />}
                onPop={refetch}
              />
            </ActionPanel>
          }
        />
      )}

      <List.Item
        title="Enable/Disable"
        icon={Icon.Bookmark}
        accessories={
          enabledSpaceIds.includes(spaceId)
            ? [{ tag: { value: "Enabled", color: Color.Green } }]
            : [{ tag: { value: "Disabled" } }]
        }
        actions={
          <ActionPanel>
            <Action
              title={enabledSpaceIds.includes(spaceId) ? "Disable" : "Enable"}
              icon={Icon.Bookmark}
              onAction={() => toggleEnableDisable(spaceId)}
            />
          </ActionPanel>
        }
      />

      <List.Section title="My Info in this space">
        {data.type === "TEAM" && (
          <>
            <List.Item
              title="My Space Auth Email"
              accessories={[
                {
                  text: spaceInMe?.myAuthEmail,
                  tag: spaceInMe?.myAuthEmail ? undefined : { value: "Same as Account", color: Color.SecondaryText },
                },
              ]}
              icon={Icon.Envelope}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="My Space Auth Email"
                    icon={Icon.Envelope}
                    target={<SpaceAuthForm spaceId={spaceId} needPop />}
                    onPop={refetch}
                  />
                </ActionPanel>
              }
            />
            <List.Item title="My Role" accessories={[{ text: spaceInMe?.myRole }]} icon={Icon.CreditCard} />
          </>
        )}
        <List.Item
          title="My NickName"
          accessories={[
            {
              text: spaceInMe?.myNickname,
              tag: spaceInMe?.myNickname ? undefined : { value: "Same as Account", color: Color.SecondaryText },
            },
          ]}
          icon={Icon.Brush}
          actions={
            <ActionPanel>
              <EditAction
                spaceId={spaceId}
                keyToEdit="myNickname"
                value={spaceInMe?.myNickname || ""}
                refetch={refetch}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="My Image"
          accessories={[
            {
              text: spaceInMe?.myImage,
              tag: spaceInMe?.myImage ? undefined : { value: "Same as Account", color: Color.SecondaryText },
            },
          ]}
          icon={spaceInMe?.myImage || Icon.Person}
          actions={
            <ActionPanel>
              <EditAction spaceId={spaceId} keyToEdit="myImage" value={spaceInMe?.myImage || ""} refetch={refetch} />
            </ActionPanel>
          }
        />
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
