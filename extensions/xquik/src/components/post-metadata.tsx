import { Detail, Icon, Image } from "@raycast/api";
import { formatDate, postMetrics } from "../lib/format";
import { Post } from "../lib/schemas";

type PostMetadataProps = {
  post: Post;
  Metadata: typeof Detail.Metadata;
};

export function PostMetadata({ post, Metadata }: PostMetadataProps) {
  const { author, createdAt } = post;
  return (
    <Metadata>
      {author && (
        <Metadata.Label
          title="Author"
          text={`${author.name} @${author.username}`}
          icon={{ source: author.profilePicture ?? Icon.Person, fallback: Icon.Person, mask: Image.Mask.Circle }}
        />
      )}
      {postMetrics(post).map(({ title, count }) => (
        <Metadata.Label key={title} title={title} text={count} />
      ))}
      {createdAt && <Metadata.Label title="Date" text={formatDate(createdAt)} />}
    </Metadata>
  );
}
