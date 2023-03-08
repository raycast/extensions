import { Detail } from "@raycast/api";

export const DetailMetaDataTags = ({ tags }: { tags: Tag[] }) => {
  if (tags.length === 0) {
    return null;
  }

  return (
    <Detail.Metadata.TagList title="Tag">
      {tags.map((tag) => (
        <Detail.Metadata.TagList.Item key={tag.name} text={tag.name} />
      ))}
    </Detail.Metadata.TagList>
  );
};
