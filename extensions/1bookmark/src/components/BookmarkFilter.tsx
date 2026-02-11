import { Icon, List, useNavigation } from "@raycast/api";
import { RouterOutputs, trpc } from "../utils/trpc.util";
import { TagSelectView } from "../views/TagSelectView";
import { Tag } from "../types";
import { useMyTags } from "../hooks/use-tags.hook";

const DropdownItem = (props: { tag: Tag; spaceIds: string[]; selectedTags: string[] }) => {
  const { tag, selectedTags } = props;
  const selected = selectedTags.find((t) => t === `${tag.spaceId}:${tag.name}`);
  return (
    <List.Dropdown.Item
      key={tag.name}
      title={`${tag.name} (${tag.space.name})`}
      icon={selected ? Icon.CheckCircle : Icon.Circle}
      value={`${tag.spaceId}:${tag.name}`}
    />
  );
};

export function BookmarkFilter(props: { me: RouterOutputs["user"]["me"]; spaceIds: string[] }) {
  const { me, spaceIds } = props;
  const { data: tags, refetch, isFetching } = useMyTags();
  const { push } = useNavigation();
  const trpcUtils = trpc.useUtils();
  const selectedTags = me.associatedSpaces.flatMap((space) => {
    return space.myTags.map((tag) => `${space.id}:${tag}`);
  });

  const summaryText =
    selectedTags.length === 0
      ? "All Bookmarks"
      : selectedTags.length < 3
        ? selectedTags
            .slice(0, 2)
            .map((t) => t.split(":")[1])
            .join(", ")
        : selectedTags
            .slice(0, 2)
            .map((t) => t.split(":")[1])
            .join(", ") +
          " + " +
          (selectedTags.length - 2);

  const subscribeTag = trpc.user.subscribeTag.useMutation();
  const unsubscribeTag = trpc.user.unsubscribeTag.useMutation();

  const toggle = async (tag: Tag) => {
    if (selectedTags.includes(`${tag.spaceId}:${tag.name}`)) {
      await unsubscribeTag.mutateAsync(
        { spaceId: tag.spaceId, tagName: tag.name },
        {
          onSuccess: () => refetch(),
        },
      );
    } else {
      await subscribeTag.mutateAsync(
        { spaceId: tag.spaceId, tagName: tag.name },
        {
          onSuccess: () => refetch(),
        },
      );
    }
  };

  return (
    <List.Dropdown
      tooltip="Subscribed Tags"
      isLoading={isFetching}
      value={"SUMMARY"}
      onChange={(newValue) => {
        const tag = tags?.find((t) => `${t.spaceId}:${t.name}` === newValue);
        if (!tag) return;

        const selected = selectedTags.includes(`${tag.spaceId}:${tag.name}`);
        const promise = toggle(tag);

        push(
          <TagSelectView
            toggleTag={newValue}
            toggleTagType={selected ? "unsubscribe" : "subscribe"}
            promise={promise}
          />,
          () => {
            trpcUtils.user.me.refetch();
          },
        );
      }}
    >
      <List.Dropdown.Item title={summaryText} icon={Icon.Tag} value={"SUMMARY"} key={"SUMMARY"} />
      <List.Dropdown.Section title="Tags">
        {tags?.map((tag) => (
          <DropdownItem key={`${tag.spaceId}:${tag.name}`} tag={tag} spaceIds={spaceIds} selectedTags={selectedTags} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
