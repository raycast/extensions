import { Detail } from "@raycast/api";
import { PostDetailsProps } from "../types/types";
import { DetailActions } from "./listActions";

function expandRating(rating: string) {
  if (rating === "g") return ["General", "#1982c4"];
  if (rating === "s") return ["Sensitive", "#8ac926"];
  if (rating === "q") return ["Questionable", "ffca3a"];
  if (rating === "e") return ["Explicit", "ff595e"];
  return ["Unknown", "#6a4c93"];
}

export default function PostDetails({ post }: PostDetailsProps) {
  const markdown = `
![Image](${post.file_url})
`;

  const rating = expandRating(post.rating);

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Artist" text={post.artist} />
          <Detail.Metadata.Label title="Copyright" text={post.copyright} />
          <Detail.Metadata.Label title="Character(s)" text={post.character} />
          <Detail.Metadata.Label title="Tags" text={post.tag_string} />
          <Detail.Metadata.TagList title="Rating">
            <Detail.Metadata.TagList.Item text={rating[0]} color={rating[1]} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="Created at" text={post.created_at} />
        </Detail.Metadata>
      }
      actions={<DetailActions post={post} />}
    />
  );
}
