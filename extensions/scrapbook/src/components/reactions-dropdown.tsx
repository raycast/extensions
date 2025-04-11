import { List } from "@raycast/api";
import { PostType, ReactionType } from "../lib/types";
import { reactionReadableName } from "../lib/utils";

export function ReactionsDropdown(props: {
  posts: PostType[];
  selectedReaction: string;
  setSelectedReaction: (user: string) => void;
}) {
  const { posts, selectedReaction, setSelectedReaction } = props;

  const reactions = posts
    ? Array.from(
        posts
          .flatMap((post) => post.reactions)
          .reduce((map, reaction) => {
            if (!map.has(reaction.name)) {
              map.set(reaction.name, reaction);
            }
            return map;
          }, new Map())
          .values(),
      )
    : [];

  return (
    <>
      <List.Dropdown
        tooltip="Select User"
        value={selectedReaction}
        onChange={(selectedItem) => {
          setSelectedReaction(selectedItem);
        }}
      >
        <List.Dropdown.Item title="All Posts" value={""} />
        <List.Dropdown.Section title="Reactions">
          {reactions.map((reaction: ReactionType) => (
            <List.Dropdown.Item
              key={reaction.name}
              title={reactionReadableName(reaction.name)}
              value={reaction.name}
              icon={reaction.url}
            />
          ))}
        </List.Dropdown.Section>
      </List.Dropdown>
    </>
  );
}
