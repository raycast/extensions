import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { copyUrl, openUrl } from "../lib/action-utils";

interface SecretSuccessPageProps {
  secretUrl: string;
  secretId: string;
  onBack?: () => void;
}

export default function SecretSuccessPage({ secretUrl, secretId, onBack }: SecretSuccessPageProps) {
  const handleCopyUrl = async () => {
    await copyUrl(secretUrl, "URL Copied", "Secret URL copied to clipboard");
  };

  const handleCopyId = async () => {
    await copyUrl(secretId, "ID Copied", "Secret ID copied to clipboard");
  };

  const handleOpenSecret = async () => {
    await openUrl(secretUrl);
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
            title="Copy ID"
            icon={Icon.Tag}
            onAction={handleCopyId}
            shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
          />
          <Action
            title="Open in Web"
            icon={Icon.Globe}
            onAction={handleOpenSecret}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
          {onBack && (
            <Action title="Back" icon={Icon.ArrowLeft} onAction={onBack} shortcut={{ modifiers: ["cmd"], key: "[" }} />
          )}
        </ActionPanel>
      }
    >
      <List.Section title="Secret Created Successfully! 🎉">
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
          title="Open in Web"
          icon={Icon.Globe}
          accessories={[{ text: "⌘O" }]}
          actions={
            <ActionPanel>
              <Action
                title="Open in Web"
                icon={Icon.Globe}
                onAction={handleOpenSecret}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
