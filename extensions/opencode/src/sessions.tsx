import { List, ActionPanel, Action, Icon, Color, showToast, Toast } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { Session } from "./types";

export default function Command() {
  const { isLoading, data, error, revalidate } = useExec("opencode", ["session", "list", "--format", "json"], {
    parseOutput: (output) => {
      try {
        const parsed = JSON.parse(output.stdout);
        // Assuming the response is an array of sessions or an object with a 'sessions' property
        const sessions = Array.isArray(parsed) ? parsed : parsed.sessions || [];
        return sessions as Session[];
      } catch (e) {
        console.error("Failed to parse sessions:", e);
        return [];
      }
    },
  });

  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to load sessions",
      message: error.message,
    });
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter sessions...">
      {data?.map((session) => (
        <List.Item
          key={session.id}
          title={session.title || session.id}
          subtitle={session.updatedAt ? new Date(session.updatedAt).toLocaleString() : ""}
          icon={Icon.Message}
          accessories={[
            {
              text: session.tokenCount ? `${session.tokenCount} tokens` : undefined,
              icon: Icon.Hashtag,
            },
            {
              text: session.cost !== undefined ? `$${session.cost.toFixed(4)}` : undefined,
              icon: { source: Icon.Coins, tintColor: Color.Yellow },
            },
          ]}
          actions={
            <ActionPanel>
              <Action.Push title="View Details" target={<SessionDetail session={session} />} icon={Icon.Sidebar} />
              <Action
                title="Continue Session"
                onAction={() => {
                  // This would ideally open the TUI with this session
                  // opencode --session session.id
                  showToast({ title: "Opening TUI...", message: `Continuing session ${session.id}` });
                }}
                icon={Icon.Terminal}
              />
              <Action
                title="Reload"
                onAction={revalidate}
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function SessionDetail({ session }: { session: Session }) {
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Session ID" text={session.id} />
          <List.Item.Detail.Metadata.Label
            title="Created"
            text={session.createdAt ? new Date(session.createdAt).toLocaleString() : "Unknown"}
          />
          <List.Item.Detail.Metadata.Label
            title="Last Activity"
            text={session.updatedAt ? new Date(session.updatedAt).toLocaleString() : "Unknown"}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Tokens" text={session.tokenCount?.toString() || "0"} />
          <List.Item.Detail.Metadata.Label
            title="Cost"
            text={session.cost !== undefined ? `$${session.cost.toFixed(4)}` : "N/A"}
          />
        </List.Item.Detail.Metadata>
      }
    />
  );
}
