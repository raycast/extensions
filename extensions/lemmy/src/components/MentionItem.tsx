import { List, Icon, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { PersonMentionView } from "lemmy-js-client";
import { client, getJwt } from "../utils/lemmy";
import { useContext } from "react";
import { MentionsContext } from "../notifications";

const MentionItem = ({ mention }: { mention: PersonMentionView }) => {
  const { mentions, setMentions } = useContext(MentionsContext);

  const markAsRead = async () => {
    try {
      await client.markPersonMentionAsRead({
        auth: await getJwt(),
        person_mention_id: mention.person_mention.id,
        read: true,
      });
    } catch {
      await showToast({
        title: "Error",
        style: Toast.Style.Failure,
        message: "Failed to mark mention as read",
      });
      return;
    }

    setMentions(mentions.filter((r) => r.person_mention.id !== mention.person_mention.id));

    await showToast({
      title: "Success",
      style: Toast.Style.Success,
      message: "Mention marked as read",
    });
  };

  return (
    <List.Item
      key={mention.person_mention.id}
      title={mention.creator.name}
      actions={
        <ActionPanel title="Actions">
          <Action title="Mark As Read" onAction={markAsRead} icon={Icon.Check} />
        </ActionPanel>
      }
      detail={<List.Item.Detail markdown={mention.comment.content || mention.post.body} />}
    />
  );
};

export default MentionItem;
