import { ActionPanel, Action, Detail, showToast, Toast, Icon, Color } from "@raycast/api";
import { useState, useEffect } from "react";
import { PassboltClient } from "./lib/passbolt";
import { Resource } from "./types";

interface ResourceDetailProps {
  resource: Resource;
  client: PassboltClient;
}

export default function ResourceDetail({ resource, client }: ResourceDetailProps) {
  const [password, setPassword] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchPassword() {
      try {
        const secretRes = await client.getSecret(resource.id);

        if (!secretRes || !secretRes.data) {
          throw new Error("No secret data found");
        }
        const decrypted = await client.decryptSecret(secretRes.data);
        setPassword(decrypted);
      } catch (error) {
        console.error("Decryption error:", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to decrypt password",
          message: String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchPassword();
  }, [resource.id, client]);

  // Build markdown content
  let markdown = `# ${resource.name}\n\n`;

  // Credentials section
  markdown += `## 🔐 Credentials\n\n`;
  if (resource.username) {
    markdown += `**Username:** ${resource.username}\n\n`;
  }
  if (password) {
    markdown += `**Password:** ${"•".repeat(12)}\n\n`;
  } else if (isLoading) {
    markdown += `**Password:** _Decrypting..._\n\n`;
  }

  // URI section
  if (resource.uri) {
    markdown += `## 🌐 URI\n\n`;
    markdown += `[${resource.uri}](${resource.uri})\n\n`;
  }

  // Description/Notes section
  if (resource.description) {
    markdown += `## 📝 Notes\n\n`;
    markdown += `${resource.description}\n\n`;
  }

  // Tags section
  if (resource.tags && resource.tags.length > 0) {
    markdown += `## 🏷️ Tags\n\n`;
    resource.tags.forEach((tag) => {
      markdown += `- ${tag.slug}${tag.is_shared ? " (shared)" : ""}\n`;
    });
    markdown += `\n`;
  }

  // Metadata section
  markdown += `## ℹ️ Metadata\n\n`;
  markdown += `**Created:** ${new Date(resource.created).toLocaleString()}\n\n`;
  markdown += `**Modified:** ${new Date(resource.modified).toLocaleString()}\n\n`;
  if (resource.favorite) {
    markdown += `**Favorite:** ⭐ Yes\n\n`;
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={resource.name}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Username" text={resource.username || "—"} icon={Icon.Person} />
          <Detail.Metadata.Label
            title="Password"
            text={password ? "••••••••" : isLoading ? "Decrypting..." : "—"}
            icon={Icon.Key}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="URI" text={resource.uri || "—"} target={resource.uri || ""} />
          <Detail.Metadata.Separator />
          {resource.tags && resource.tags.length > 0 && (
            <>
              <Detail.Metadata.TagList title="Tags">
                {resource.tags.map((tag) => (
                  <Detail.Metadata.TagList.Item
                    key={tag.id}
                    text={tag.slug}
                    color={tag.is_shared ? Color.Green : Color.Blue}
                  />
                ))}
              </Detail.Metadata.TagList>
              <Detail.Metadata.Separator />
            </>
          )}
          <Detail.Metadata.Label title="Created" text={new Date(resource.created).toLocaleDateString()} />
          <Detail.Metadata.Label title="Modified" text={new Date(resource.modified).toLocaleDateString()} />
          {resource.favorite && <Detail.Metadata.Label title="Favorite" icon="⭐" />}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Credentials">
            {password && (
              <>
                <Action.CopyToClipboard
                  title="Copy Password"
                  content={password}
                  icon={Icon.Key}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action.Paste
                  title="Paste Password"
                  content={password}
                  icon={Icon.Key}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
                />
              </>
            )}
            {resource.username && (
              <>
                <Action.CopyToClipboard title="Copy Username" content={resource.username} icon={Icon.Person} />
                <Action.Paste title="Paste Username" content={resource.username} icon={Icon.Person} />
              </>
            )}
          </ActionPanel.Section>
          {resource.uri && (
            <ActionPanel.Section title="URI">
              <Action.OpenInBrowser
                title="Open URI"
                url={resource.uri}
                icon={Icon.Globe}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
              <Action.CopyToClipboard title="Copy URI" content={resource.uri} icon={Icon.Link} />
            </ActionPanel.Section>
          )}
          {resource.description && (
            <ActionPanel.Section title="Notes">
              <Action.CopyToClipboard title="Copy Notes" content={resource.description} icon={Icon.Text} />
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );
}
