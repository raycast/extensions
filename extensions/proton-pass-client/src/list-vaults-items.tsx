import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { useVaultItems } from "./lib/pass/useVaultItems";
import { useMemo, useState } from "react";
import { useVaults } from "./lib/pass/useVaults";
import { ErrorView } from "./lib/components/error";

export default function ListVaultsItems(props: { vaultName: string }) {
  const { vaults } = useVaults();
  const { items, isLoading, error } = useVaultItems(props.vaultName);
  const [filter, setFilter] = useState<string>("Active");

  const filteredItems = useMemo(() => {
    if (filter == "All") return items;
    else if (filter == "Active" || filter == "Trashed") {
      // Filter state
      return items?.filter((item) => item.state === filter);
    } else {
      // Filter vault
      return items?.filter((item) => item.vaultTitle === filter);
    }
  }, [items, filter]);

  return (
    <List
      searchBarPlaceholder={`Search items in ${props.vaultName ?? "All Vaults"}...`}
      navigationTitle={`Items in ${props.vaultName ?? "All Vaults"}`}
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown tooltip={"Filter items by state"} onChange={setFilter} value={filter}>
          <List.Dropdown.Item title="All" value="All" icon={Icon.AppWindowGrid3x3} />
          <List.Dropdown.Section title="Status">
            <List.Dropdown.Item title="Active" value="Active" icon={Icon.CheckCircle} />
            <List.Dropdown.Item title="Trashed" value="Trashed" icon={Icon.Trash} />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Vaults">
            {vaults?.map((vault) => {
              return <List.Dropdown.Item title={vault.title} value={vault.title} key={vault.id} icon={Icon.Folder} />;
            })}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {error != null && <ErrorView />}
      {filteredItems != null &&
        filteredItems.map((item) => {
          const accessories: List.Item.Accessory[] = [];
          if (item.type == "Login" && item.urls && item.urls.length > 0) {
            try {
              const url = new URL(item.urls[0]);
              accessories.push({ text: url.hostname, tooltip: item.urls[0] });
            } catch {
              accessories.push({ text: item.urls[0], tooltip: item.urls[0] });
            }
          }

          if (item.isActiveOrigin) {
            accessories.push({ icon: Icon.Globe, tooltip: "Active website" });
          }

          if (item.vaultTitle) {
            accessories.push({ text: item.vaultTitle, tooltip: "Vault" });
          }

          return (
            <List.Item
              key={item.id}
              icon={item.icon}
              title={item.title}
              accessories={accessories}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    {item.clipboardElements &&
                      item.clipboardElements.map((element, index) => {
                        if (!element) return;
                        const shortcut: Keyboard.Shortcut | undefined =
                          index == 0
                            ? { modifiers: ["cmd"], key: "c" }
                            : index == 1
                              ? { modifiers: ["cmd", "shift"], key: "c" }
                              : index == 2
                                ? { modifiers: ["cmd", "shift", "alt"], key: "c" }
                                : index == 3
                                  ? { modifiers: ["cmd", "shift", "alt", "ctrl"], key: "c" }
                                  : undefined;

                        return (
                          <Action.CopyToClipboard
                            key={index}
                            title={`Copy ${element.title}`}
                            content={element.content}
                            concealed={element.confidential}
                            shortcut={shortcut}
                          />
                        );
                      })}
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    {item.type == "Login" &&
                      item.urls?.map((url, index) => {
                        return (
                          <Action.OpenInBrowser
                            key={index}
                            title={`Open ${url}`}
                            url={url}
                            shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                          />
                        );
                      })}
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
    </List>
  );
}
