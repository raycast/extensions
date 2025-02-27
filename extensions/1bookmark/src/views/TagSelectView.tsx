import { trpc } from "@/utils/trpc.util";
import { Action, ActionPanel, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { CachedQueryClientProvider } from "../components/CachedQueryClientProvider";
import { NewTagForm } from "./NewTagForm";
import { useMe } from "../hooks/use-me.hook";
import { useAtom } from "jotai";
import { sessionTokenAtom } from "../states/session-token.state";
import { Tag } from "../types";
import { useEffect } from "react";

const TagItem = (props: {
  tag: Tag;
  selectedTags: string[];
  handleToggle: (tag: Tag) => void;
  refetch: () => void;
}) => {
  const { tag, selectedTags, handleToggle, refetch } = props;
  const selected = selectedTags.find((t) => t === `${tag.spaceId}:${tag.name}`);

  const title = tag.icon ? `${tag.icon} ${tag.name}` : tag.name;

  return (
    <List.Item
      key={`${tag.spaceId}:${tag.name}`}
      title={title}
      icon={selected ? Icon.CheckCircle : Icon.Circle}
      subtitle={tag.space.name}
      actions={
        <ActionPanel>
          <Action title={"Select Tag"} icon={Icon.CheckCircle} onAction={() => handleToggle(tag)} />
          <Action.Push
            title={"Create New Tag"}
            icon={Icon.Plus}
            shortcut={Keyboard.Shortcut.Common.New}
            target={<NewTagForm spaceId={tag.spaceId} />}
            onPop={() => refetch()}
          />
        </ActionPanel>
      }
    />
  );
};

export const Body = (props: {
  spaceIds: string[];
  toggleTag: string; // Tag clicked from DropDown UI.
  toggleTagType: "subscribe" | "unsubscribe"; // Which action was clicked.
  promise: Promise<void>;
}) => {
  const { spaceIds, toggleTag, toggleTagType, promise } = props;
  const [sessionToken] = useAtom(sessionTokenAtom);
  const me = useMe(sessionToken);
  const { data: tags, refetch, isFetching } = trpc.tag.list.useQuery({ spaceIds });

  const selectedTags = me.data?.associatedSpaces.flatMap((space) => {
    return space.myTags.map((tag) => `${space.id}:${tag}`);
  });

  const subscribeTag = trpc.user.subscribeTag.useMutation();
  const unsubscribeTag = trpc.user.unsubscribeTag.useMutation();
  const loading = subscribeTag.isPending || unsubscribeTag.isPending || isFetching || me.isRefetching;

  const handleToggle = async (tag: Tag) => {
    if (!selectedTags) return;
    if (loading) return;

    if (selectedTags.includes(`${tag.spaceId}:${tag.name}`)) {
      await unsubscribeTag.mutateAsync({ spaceId: tag.spaceId, tagName: tag.name });
    } else {
      await subscribeTag.mutateAsync({ spaceId: tag.spaceId, tagName: tag.name });
    }

    me.refetch();
  };

  const refetchMe = me.refetch;
  useEffect(() => {
    promise
      .then(() => {
        refetchMe();
        showToast({
          style: Toast.Style.Success,
          title: `${toggleTagType === "subscribe" ? "Subscribed" : "Unsubscribed"} Tag: ${toggleTag.split(":")[1]}`,
        });
      })
      .catch((error) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to toggle tag",
          message: error.message,
        });
      });
  }, [promise, refetchMe, toggleTag, toggleTagType]);

  if (tags && tags.length === 0) {
    return (
      <List>
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
                target={<NewTagForm spaceId={spaceIds[0]!} />}
                onPop={() => refetch()}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={loading}>
      {tags?.map((tag) => (
        <TagItem
          key={`${tag.spaceId}:${tag.name}`}
          tag={tag}
          selectedTags={selectedTags || []}
          handleToggle={handleToggle}
          refetch={refetch}
        />
      ))}
    </List>
  );
};

export function TagSelectView(props: {
  spaceIds: string[];
  toggleTag: string;
  toggleTagType: "unsubscribe" | "subscribe";
  promise: Promise<void>;
}) {
  const { spaceIds, toggleTag, toggleTagType, promise } = props;
  return (
    <CachedQueryClientProvider>
      <Body spaceIds={spaceIds} toggleTag={toggleTag} toggleTagType={toggleTagType} promise={promise} />
    </CachedQueryClientProvider>
  );
}
