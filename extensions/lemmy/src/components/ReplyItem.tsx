import { List, Icon, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { CommentReplyView } from "lemmy-js-client";
import { getPreferences } from "../interfaces/preferences";
import { client, getJwt } from "../utils/lemmy";
import { useContext } from "react";
import { RepliesContext } from "../notifications";

const ReplyItem = ({ reply }: { reply: CommentReplyView }) => {
  const { replies, setReplies } = useContext(RepliesContext);

  const markAsRead = async () => {
    try {
      await client.markCommentReplyAsRead({
        auth: await getJwt(),
        comment_reply_id: reply.comment_reply.id,
        read: true,
      });
    } catch {
      await showToast({
        title: "Error",
        style: Toast.Style.Failure,
        message: "Failed to mark comment reply as read",
      });
      return;
    }

    setReplies(replies.filter((r) => r.comment.id !== reply.comment.id));

    await showToast({
      title: "Success",
      style: Toast.Style.Success,
      message: "Comment reply marked as read",
    });
  };

  return (
    <List.Item
      key={reply.comment.id}
      title={reply.creator.name}
      subtitle={reply.comment.content}
      accessories={[
        {
          text: reply.post.name,
          icon: Icon.Paragraph,
        },
      ]}
      detail={<List.Item.Detail markdown={reply.comment.content} />}
      actions={
        <ActionPanel title="Actions">
          <Action.OpenInBrowser url={`${getPreferences().instanceUrl}/comment/${reply.comment.id}`} />
          <Action title="Mark As Read" onAction={markAsRead} icon={Icon.Check} />
          <Action.CopyToClipboard title="Copy Reply Text" content={reply.comment.content} />
        </ActionPanel>
      }
    />
  );
};

export default ReplyItem;
