import { Icon, Image, List } from "@raycast/api";
import { ReactNode } from "react";
import { postMarkdown, postTitle } from "../lib/format";
import { Post } from "../lib/schemas";
import { PostActions } from "./post-actions";
import { PostMetadata } from "./post-metadata";

type PostListItemProps = {
  post: Post;
  firstAction?: ReactNode;
  lastAction?: ReactNode;
  event?: string;
};

export function PostListItem({ post, firstAction, lastAction, event }: PostListItemProps) {
  return (
    <List.Item
      id={post.id}
      title={postTitle(post.text)}
      icon={{ source: post.author?.profilePicture ?? Icon.Person, fallback: Icon.Person, mask: Image.Mask.Circle }}
      accessories={post.createdAt ? [{ date: new Date(post.createdAt) }] : []}
      detail={
        <List.Item.Detail
          markdown={postMarkdown(post)}
          metadata={<PostMetadata post={post} event={event} Metadata={List.Item.Detail.Metadata} />}
        />
      }
      actions={<PostActions post={post} firstAction={firstAction} lastAction={lastAction} />}
    />
  );
}
