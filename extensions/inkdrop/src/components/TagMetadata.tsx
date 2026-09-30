import { Color, List } from "@raycast/api";
import { TAG_COLOR_MAP } from "../inkdrop";
import type { Note, Tag } from "../inkdrop";

export const TagMetadata = ({ note, tags }: { note: Note; tags: Tag[] | undefined }) => {
  if (!tags) return null;
  const matchedTags = note.tags
    .map((tagId) => tags.find((tag) => tag._id === tagId))
    .filter((tag): tag is Tag => Boolean(tag));
  if (matchedTags.length === 0) return null;
  return (
    <List.Item.Detail.Metadata.TagList title="Tags">
      {matchedTags.map((tag) => (
        <List.Item.Detail.Metadata.TagList.Item
          key={tag._id}
          text={tag.name}
          color={TAG_COLOR_MAP[tag.color] ?? Color.SecondaryText}
        />
      ))}
    </List.Item.Detail.Metadata.TagList>
  );
};
