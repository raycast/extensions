import { Action, ActionPanel, Icon } from "@raycast/api";
import PostDetails from "./postDetails";
import { PostDetailsProps } from "../types/types";

function ListActions(props: PostDetailsProps) {
  return (
    <ActionPanel title={`Post ID: ${props.post.id}`}>
      <Action.OpenInBrowser title="Open in Danbooru" url={`https://danbooru.donmai.us/posts/${props.post.id}`} />
      <Action.Push title="See Details" target={<PostDetails post={props.post} />} icon={Icon.Document} />
      <Action.OpenInBrowser title="Open Large View" url={props.post.file_url} />
    </ActionPanel>
  );
}

function DetailActions(props: PostDetailsProps) {
  return (
    <ActionPanel title={`Post ID: ${props.post.id}`}>
      <Action.OpenInBrowser title="Open in Danbooru" url={`https://danbooru.donmai.us/posts/${props.post.id}`} />
      <Action.OpenInBrowser title="Open Large View" url={props.post.file_url} />
    </ActionPanel>
  );
}

export { ListActions, DetailActions };
