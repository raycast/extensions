import { Action, ActionPanel, Clipboard, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import type { ItemMetadataMap } from "./items/item-cache";
import type { ItemSummary } from "./items/item";
import { modules } from "./raycast/create-modules";
import { importantShortcut } from "./raycast/shortcuts";
export default function Command() {
  const [items, setItems] = useState<ItemSummary[]>([]);
  const [metadata, setMetadata] = useState<ItemMetadataMap>({});
  const [isLoading, setIsLoading] = useState(true);
  async function load() {
    setIsLoading(true);
    try {
      const cached = await modules.items.getCached();
      if (cached) {
        setMetadata(cached.metadata);
        setItems(modules.authenticator.listCandidates(cached.items, cached.metadata));
      }
      if ((await modules.session.getStatus()).state !== "ready") return;
      const fresh = await modules.items.refresh(await modules.vaults.list());
      const nextMetadata = await modules.items.hydrate(fresh.items);
      setMetadata(nextMetadata);
      setItems(modules.authenticator.listCandidates(fresh.items, nextMetadata));
    } finally {
      setIsLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function copy(item: ItemSummary) {
    await Clipboard.copy(await modules.authenticator.generateCode(item));
    await showToast({ style: Toast.Style.Success, title: "TOTP copied" });
  }
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search authenticator accounts">
      {items.map((item) => (
        <List.Item
          key={`${item.shareId}:${item.itemId}`}
          title={item.title}
          subtitle={item.vaultName}
          icon={Icon.Clock}
          accessories={[
            {
              text:
                metadata[`${item.shareId}:${item.itemId}`]?.email ||
                metadata[`${item.shareId}:${item.itemId}`]?.username ||
                item.vaultName,
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Copy TOTP"
                icon={Icon.CopyClipboard}
                shortcut={importantShortcut("t")}
                onAction={() => copy(item)}
              />
              <ActionPanel.Section>
                <Action title="Refresh" icon={Icon.ArrowClockwise} shortcut={importantShortcut("r")} onAction={load} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
      {!isLoading && items.length === 0 ? <List.EmptyView title="No TOTP items found" /> : null}
    </List>
  );
}
