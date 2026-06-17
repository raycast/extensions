import { ActionPanel, Action, List, Icon, showToast, Toast } from "@raycast/api";
import { copyUrl, openUrl } from "../lib/action-utils";

interface SuccessPageProps {
  secretUrl: string;
  secretId: string;
}

export default function SuccessPage({ secretUrl, secretId }: SuccessPageProps) {
  const handleCopyUrl = async () => {
    await copyUrl(secretUrl, "URL Copied", "Request secret URL copied to clipboard");
  };

  const handleCopyInstructions = async () => {
    const instructions = `Please use this link to submit your secret: ${secretUrl}`;
    await copyUrl(instructions, "Instructions Copied", "Request instructions copied to clipboard");
  };

  const handleCopyId = async () => {
    await copyUrl(secretId, "ID Copied", "Request secret ID copied to clipboard");
  };

  return (
    <List
      actions={
        <ActionPanel>
          <Action
            title="Copy URL"
            icon={Icon.CopyClipboard}
            onAction={handleCopyUrl}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action
            title="Copy Instructions"
            icon={Icon.Document}
            onAction={handleCopyInstructions}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action
            title="Copy ID"
            icon={Icon.Tag}
            onAction={handleCopyId}
            shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
          />
          <Action
            title="View Details"
            icon={Icon.Info}
            onAction={() => {
              showToast({
                style: Toast.Style.Success,
                title: "Request Details",
                message: `ID: ${secretId}\nURL: ${secretUrl}`,
              });
            }}
            shortcut={{ modifiers: ["cmd"], key: "i" }}
          />
          <Action
            title="Open in Web"
            icon={Icon.Globe}
            onAction={() => openUrl(secretUrl)}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
        </ActionPanel>
      }
    >
      <List.Section title="Quick Actions">
        <List.Item
          title="Copy URL"
          icon={Icon.CopyClipboard}
          accessories={[{ text: "⌘C" }]}
          actions={
            <ActionPanel>
              <Action
                title="Copy URL"
                icon={Icon.CopyClipboard}
                onAction={handleCopyUrl}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Copy Instructions"
          icon={Icon.Document}
          accessories={[{ text: "⌘⇧C" }]}
          actions={
            <ActionPanel>
              <Action
                title="Copy Instructions"
                icon={Icon.Document}
                onAction={handleCopyInstructions}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Copy ID"
          icon={Icon.Tag}
          accessories={[{ text: "⌘⌥C" }]}
          actions={
            <ActionPanel>
              <Action
                title="Copy ID"
                icon={Icon.Tag}
                onAction={handleCopyId}
                shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="View Details"
          icon={Icon.Info}
          accessories={[{ text: "⌘I" }]}
          actions={
            <ActionPanel>
              <Action
                title="View Details"
                icon={Icon.Info}
                onAction={() => {
                  showToast({
                    style: Toast.Style.Success,
                    title: "Request Details",
                    message: `ID: ${secretId}\nURL: ${secretUrl}`,
                  });
                }}
                shortcut={{ modifiers: ["cmd"], key: "i" }}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Open in Web"
          icon={Icon.Globe}
          accessories={[{ text: "⌘O" }]}
          actions={
            <ActionPanel>
              <Action
                title="Open in Web"
                icon={Icon.Globe}
                onAction={() => openUrl(secretUrl)}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
