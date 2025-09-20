import { useEffect, useState } from "react";
import { Action, ActionPanel, Detail, Toast, showToast, useNavigation } from "@raycast/api";
import type { Comment } from "../interfaces";
import { addMarkdownImages, formatDate } from "../utils";

export function CommentDetails(props: {
  getLastCommentCb: () => Promise<Comment | null>;
  instance: string;
  issueId: string;
}) {
  const [comment, setComment] = useState<Comment | null | undefined>(undefined);
  const { pop } = useNavigation();
  const { getLastCommentCb } = props;

  useEffect(() => {
    async function fetchComment() {
      const comment = await getLastCommentCb();
      setComment(comment);
    }
    fetchComment();
  }, [getLastCommentCb]);

  if (comment === undefined) {
    return <Detail isLoading />;
  }

  if (comment === null) {
    showToast({
      style: Toast.Style.Failure,
      title: "No comments yet",
    });
    pop();
    return;
  }

  return (
    <Detail
      isLoading={comment === undefined}
      markdown={addMarkdownImages(comment, props.instance)}
      navigationTitle={`By ${comment.author?.fullName} on ${formatDate(comment.created)}`}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            content={`${props.instance}/issue/${props.issueId}#focus=Comments-${comment.id}.0-0`}
            title="Copy Link"
          />
          <Action.OpenInBrowser url={`${props.instance}/issue/${props.issueId}#focus=Comments-${comment.id}.0-0`} />
        </ActionPanel>
      }
    />
  );
}
