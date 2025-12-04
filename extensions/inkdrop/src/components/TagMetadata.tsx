import { getPreferenceValues, List } from "@raycast/api";
import { getInkdrop, type InkdropOption, type Note } from "../inkdrop";

export const TagMetadata = ({ note }: { note: Note }) => {
  const { useTags } = getInkdrop(getPreferenceValues<InkdropOption>());
  const { tags } = useTags();

  // TODO: want to use `List.Item.Detail.Metadata.TagList` or `Detail.Metadata.TagList`
  const tagLabelText = note.tags
    .map((tagId) => {
      const tag = tags?.find((tag) => tag._id === tagId);
      return tag?.name;
    })
    .join(", ");
  return tagLabelText.length !== 0 ? <List.Item.Detail.Metadata.Label title="Tags" text={tagLabelText} /> : null;
};
