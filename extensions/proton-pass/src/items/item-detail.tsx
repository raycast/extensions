import { Action, ActionPanel, Alert, confirmAlert, Detail, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import type { ItemDetails, ItemSummary } from "./item";
import { modules } from "../raycast/create-modules";
import { importantShortcut } from "../raycast/shortcuts";

export function ItemDetail({
  item,
  onUse,
  onDelete,
}: {
  item: ItemSummary;
  onUse?: () => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [details, setDetails] = useState<ItemDetails>();
  const [totp, setTotp] = useState<string>();
  const [error, setError] = useState<string>();
  const { pop } = useNavigation();

  useEffect(() => {
    modules.items
      .view(item)
      .then(async (value) => {
        setDetails(value);
        await onUse?.();
      })
      .catch((value) => setError(value instanceof Error ? value.message : String(value)));
  }, [item.itemId, item.shareId]);

  useEffect(() => {
    if (!details?.hasTotp) return;
    const refresh = () =>
      void modules.authenticator
        .generateCode(item)
        .then(setTotp)
        .catch(() => setTotp(undefined));
    refresh();
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, [details?.hasTotp, item.itemId, item.shareId]);

  if (error) return <Detail markdown={`# Unable to load item\n\n${error}`} />;
  if (!details) return <Detail isLoading markdown="# Loading item…" />;

  const markdown = [
    `# ${escapeMarkdown(details.title)}`,
    details.username ? `**Username**\n\n${escapeMarkdown(details.username)}` : "",
    details.email ? `**Email**\n\n${escapeMarkdown(details.email)}` : "",
    details.password ? "**Password**\n\n`••••••••••••`" : "",
    details.urls.length ? `**URLs**\n\n${details.urls.map((url) => `- ${url}`).join("\n")}` : "",
    `**TOTP**\n\n${details.hasTotp ? (totp ? `\`${totp}\`` : "Loading…") : "Not yet configured"}`,
    details.note ? `**Note**\n\n${escapeMarkdown(details.note)}` : "",
  ]
    .filter(Boolean)
    .join("\n\n---\n\n");

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          {details.password ? (
            <Action.CopyToClipboard
              title="Copy Password"
              content={details.password}
              icon={Icon.Key}
              shortcut={importantShortcut("p")}
            />
          ) : null}
          {details.username ? (
            <Action.CopyToClipboard
              title="Copy Username"
              content={details.username}
              shortcut={importantShortcut("u")}
            />
          ) : null}
          {details.email ? (
            <Action.CopyToClipboard title="Copy Email" content={details.email} shortcut={importantShortcut("e")} />
          ) : null}
          {details.urls[0] ? <Action.OpenInBrowser title="Open URL" url={details.urls[0]} /> : null}
          {details.urls[0] ? (
            <Action.CopyToClipboard title="Copy URL" content={details.urls[0]} shortcut={importantShortcut("l")} />
          ) : null}
          <ActionPanel.Section title="Danger Zone">
            <Action
              title="Delete Item"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={async () => {
                const confirmed = await confirmAlert({
                  title: `Delete ${item.title}?`,
                  message: "This permanently deletes the item and cannot be undone.",
                  primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                });
                if (!confirmed) return;
                try {
                  await modules.items.remove(item);
                  await modules.activity.remove(item);
                  await onDelete?.();
                  await showToast({ style: Toast.Style.Success, title: "Item deleted" });
                  pop();
                } catch (error) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Unable to delete item",
                    message: error instanceof Error ? error.message : String(error),
                  });
                }
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function escapeMarkdown(value: string) {
  return value.replace(/[\\`*_{}[\]()#+.!-]/g, "\\$&");
}
