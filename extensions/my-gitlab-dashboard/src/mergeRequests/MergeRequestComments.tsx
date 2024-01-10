import { Action, ActionPanel, Color, Icon, List, getPreferenceValues } from "@raycast/api";
import { relativeDateAccessory } from "../utils";
import { Comment } from "../gitlab/mergeRequest";

interface Preferences {
  colorizedDatesForComments?: boolean;
}
const preferences = getPreferenceValues<Preferences>();

export function MergeRequestComments(props: { mrTitle: string; comments: Comment[] }) {
  return (
    <List navigationTitle={props.mrTitle}>
      <List.Section key={props.mrTitle} title="Comments" subtitle={commentsSummary(props.comments)}>
        {props.comments.map((c) => (
          <List.Item
            key={c.id}
            title={c.body}
            icon={Icon.Bubble}
            actions={<CommentActions comment={c} />}
            accessories={commentAccessories(c)}
          />
        ))}
      </List.Section>
    </List>
  );
}

function commentsSummary(comments: Comment[]): string {
  const unresolvedCount = comments.filter((c) => c.isUnresolved).length;
  return unresolvedCount > 0 ? `${unresolvedCount} unresolved` : "";
}

function CommentActions(props: { comment: Comment }) {
  return (
    <ActionPanel>
      <Action.OpenInBrowser url={props.comment.webUrl} title="Open in Browser" />
    </ActionPanel>
  );
}

function commentAccessories(comment: Comment): List.Item.Accessory[] {
  const accessories = [];

  if (comment.isUnresolved) {
    accessories.push({
      icon: Icon.Eye,
      tooltip: "Unresolved",
    });
  }

  accessories.push(
    comment.author.isMe
      ? {
          text: { value: `${comment.author.teamUsername}`, color: Color.Yellow },
          icon: { source: Icon.Person, tintColor: Color.Yellow },
        }
      : {
          text: comment.author.teamUsername,
          icon: Icon.Person,
        },
  );

  accessories.push(
    relativeDateAccessory(comment.updatedAt, "Posted", preferences.colorizedDatesForComments && comment.isUnresolved),
  );

  return accessories;
}
