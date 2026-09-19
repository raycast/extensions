import { Action, ActionPanel, Alert, Icon, Toast, confirmAlert, showToast } from "@raycast/api";
import { TinkererCommunity } from "../api/community";
import { errorMessage } from "../lib/json";

const REACTIONS = ["❤️", "👍", "🔥", "😂", "🎉"] as const;

interface ReactionActionsProps {
  community: TinkererCommunity;
  id: string;
  onChanged: (reaction: string | null) => void;
  viewerReaction?: string | undefined;
}

async function runReaction(
  title: string,
  message: string,
  operation: () => Promise<unknown>,
  onChanged: (reaction: string | null) => void,
  nextReaction: string | null,
) {
  const confirmed = await confirmAlert({
    title,
    message,
    primaryAction: { title, style: Alert.ActionStyle.Default },
  });
  if (!confirmed) return;

  const toast = await showToast({ style: Toast.Style.Animated, title: `${title}…` });
  try {
    await operation();
    toast.style = Toast.Style.Success;
    toast.title = "Reaction Updated";
    onChanged(nextReaction);
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could Not Update Reaction";
    toast.message = errorMessage(error);
  }
}

export function PostReactionActions({ community, id, onChanged, viewerReaction }: ReactionActionsProps) {
  return (
    <ActionPanel.Submenu title="React to Post" icon={Icon.Heart}>
      {REACTIONS.map((reaction) => (
        <Action
          key={reaction}
          title={`${reaction} ${viewerReaction === reaction ? "Reacted" : "React"}`}
          onAction={() =>
            runReaction(
              `React ${reaction}`,
              `Add ${reaction} to this post?`,
              () => community.reactToPost(id, reaction),
              onChanged,
              reaction,
            )
          }
        />
      ))}
      {viewerReaction ? (
        <Action
          title={`Remove ${viewerReaction}`}
          icon={Icon.Trash}
          onAction={() =>
            runReaction(
              "Remove Reaction",
              `Remove ${viewerReaction} from this post?`,
              () => community.removePostReaction(id, viewerReaction),
              onChanged,
              null,
            )
          }
        />
      ) : null}
    </ActionPanel.Submenu>
  );
}

export function CommentReactionActions({ community, id, onChanged, viewerReaction }: ReactionActionsProps) {
  return (
    <ActionPanel.Submenu title="React to Comment" icon={Icon.Heart}>
      {REACTIONS.map((reaction) => (
        <Action
          key={reaction}
          title={`${reaction} ${viewerReaction === reaction ? "Reacted" : "React"}`}
          onAction={() =>
            runReaction(
              `React ${reaction}`,
              `Add ${reaction} to this comment?`,
              () => community.reactToComment(id, reaction),
              onChanged,
              reaction,
            )
          }
        />
      ))}
      {viewerReaction ? (
        <Action
          title={`Remove ${viewerReaction}`}
          icon={Icon.Trash}
          onAction={() =>
            runReaction(
              "Remove Reaction",
              `Remove ${viewerReaction} from this comment?`,
              () => community.removeCommentReaction(id),
              onChanged,
              null,
            )
          }
        />
      ) : null}
    </ActionPanel.Submenu>
  );
}
