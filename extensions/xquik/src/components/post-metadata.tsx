import { Detail, Icon, Image } from "@raycast/api";
import { formatDate, postMetrics } from "../lib/format";
import { Post } from "../lib/schemas";

type PostMetadataProps = {
  post: Post;
  event?: string;
  Metadata: typeof Detail.Metadata;
};

export function PostMetadata({ post, event, Metadata }: PostMetadataProps) {
  const { author, createdAt } = post;
  return (
    <Metadata>
      {event && <Metadata.Label title="Event" text={event} />}
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
