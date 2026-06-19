import { Action, ActionPanel, Icon, List, open } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { PostingsList } from "./components/postings-list";
import { AuthGuard } from "./lib/auth-guard";
import { runHey } from "./lib/hey";
import type { HeyBox } from "./lib/types";

export default function BrowseMailCommand() {
  return (
    <AuthGuard>
      <MailboxesList />
    </AuthGuard>
  );
}

function MailboxesList() {
  const { isLoading, data, error, revalidate } = usePromise(async () => {
    const response = await runHey<HeyBox[]>(["boxes", "--json"]);
    return response.data;
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search mailboxes…">
      {error ? (
        <List.EmptyView
          title="Could Not Load Mailboxes"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={() => revalidate()} />
            </ActionPanel>
          }
        />
      ) : null}
      {(data ?? []).map((box) => (
        <List.Item
          key={box.id}
          title={box.name}
          subtitle={box.kind}
          icon={mailboxIcon(box.kind)}
          actions={
            <ActionPanel>
              <Action.Push title="Browse Messages" icon={Icon.List} target={<PostingsList box={box} />} />
              <Action title="Open in HEY" icon={Icon.Globe} onAction={() => open(box.app_url)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function mailboxIcon(kind: string) {
  switch (kind) {
    case "imbox":
      return Icon.Envelope;
    case "feedbox":
      return Icon.Newspaper;
    case "trailbox":
      return Icon.Document;
    case "asidebox":
      return Icon.Folder;
    case "laterbox":
      return Icon.Clock;
    case "bubblebox":
      return Icon.Bubble;
    default:
      return Icon.Mail;
  }
}
