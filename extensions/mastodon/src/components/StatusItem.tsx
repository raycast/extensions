import { Action, ActionPanel, Icon, LaunchType, List, launchCommand, showToast } from "@raycast/api";
import { mastodon } from "masto";
import { stripHtml } from "string-strip-html";
import { useMasto } from "../hooks/masto";

export default function StatusItem({ status }: { status: mastodon.v1.Status }) {
  const masto = useMasto();
  return (
    <List.Item
      title={status.spoilerText || status.text || stripHtml(status.content).result}
      accessories={[{ icon: status.account.avatar, text: status.account.acct }]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={status.url ?? status.uri} />
          <Action
            title="Reply"
            icon={Icon.Reply}
            onAction={async () => {
              launchCommand({ name: "post", type: LaunchType.UserInitiated, context: { replyTo: status } });
            }}
          />
          <Action
            title="Reblog"
            icon={Icon.Repeat}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={async () => {
              masto?.v1.statuses.reblog(status.id);
              showToast({ title: "Successfully rebloged!" });
            }}
          />
          <Action
            title="Favorite"
            icon={Icon.Star}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
            onAction={async () => {
              masto?.v1.statuses.favourite(status.id);
              showToast({ title: "Successfully added to your favorites!" });
            }}
          />
        </ActionPanel>
      }
    />
  );
}
