import { Action, ActionPanel, Icon, List, Toast, showToast } from "@raycast/api";
import { PostView } from "lemmy-js-client";
import { getPreferences } from "../interfaces/preferences";
import { judgePost, savePost } from "../utils/posts";
import { useState } from "react";

const PostItem = ({ post }: { post: PostView }) => {
  const [isLiked, setIsLiked] = useState(post.my_vote === 1);
  const [isDisliked, setIsDisliked] = useState(post.my_vote === -1);
  const [isSaved, setIsSaved] = useState(post.saved);

  const actorIdURL = new URL(post.community.actor_id);

  return (
    <List.Item
      title={post.post.name}
      subtitle={post.post.body}
      icon={post.post.thumbnail_url || Icon.Paragraph}
      accessories={[
        {
          icon: Icon.Person,
          text: post.creator.name,
        },
      ]}
      detail={
        <List.Item.Detail
          markdown={`# ${post.post.name}\n\n${
            post.post.thumbnail_url ? `![Thumbnail](${post.post.thumbnail_url})\n` : ""
          }\n${post.post.body || ""}`}
        />
      }
      actions={
        <ActionPanel title="Actions">
          <ActionPanel.Section>
            <Action.OpenInBrowser
              title="Open Lemmy Post"
              url={`${getPreferences().instanceUrl}/post/${post.post.id}`}
            />
            {post.post.url && <Action.OpenInBrowser title="Open Linked URL" url={post.post.url} />}
            <Action.OpenInBrowser
              title="Open Lemmy User"
              url={`${getPreferences().instanceUrl}/u/${post.creator.name}`}
            />
            <Action.OpenInBrowser
              title="Open Lemmy Community"
              url={`${
                actorIdURL.origin === getPreferences().instanceUrl
                  ? post.community.actor_id
                  : `${getPreferences().instanceUrl}/c/${post.community.name}@${actorIdURL.hostname}`
              }`}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title={`${isLiked ? "Unlike" : "Like"} Post`}
              icon={Icon.ArrowUp}
              onAction={() => {
                try {
                  judgePost(post, isLiked ? 0 : 1);
                } catch {
                  showToast({
                    title: "Error",
                    message: "Failed to judge post.",
                    style: Toast.Style.Failure,
                  });
                  return;
                }
                // If the post is already disliked, we need to remove the dislike
                if (isDisliked) {
                  setIsDisliked(false);
                }

                setIsLiked(!isLiked);

                showToast({
                  title: "Success",
                  message: "Successfully judged post.",
                  style: Toast.Style.Success,
                });
              }}
            />
            <Action
              title={`${isDisliked ? "Undislike" : "Dislike"} Post`}
              icon={Icon.ArrowDown}
              onAction={() => {
                try {
                  judgePost(post, isDisliked ? 0 : -1);
                } catch {
                  showToast({
                    title: "Error",
                    message: "Failed to judge post.",
                    style: Toast.Style.Failure,
                  });
                  return;
                }
                // If the post is already liked, we need to remove the like
                if (isLiked) {
                  setIsLiked(false);
                }

                setIsDisliked(!isDisliked);

                showToast({
                  title: "Success",
                  message: "Successfully judged post.",
                  style: Toast.Style.Success,
                });
              }}
            />
            <Action
              title={`${isSaved ? "Unsave" : "Save"} Post`}
              icon={Icon.Bookmark}
              onAction={() => {
                try {
                  savePost(post, !isSaved);
                } catch {
                  showToast({
                    title: "Error",
                    message: "Failed to (un)save post.",
                    style: Toast.Style.Failure,
                  });
                  return;
                }

                setIsSaved(!isSaved);

                showToast({
                  title: "Success",
                  message: "Successfully (un)saved post.",
                  style: Toast.Style.Success,
                });
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};

export default PostItem;
