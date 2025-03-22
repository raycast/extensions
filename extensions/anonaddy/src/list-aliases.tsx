import { useEffect, useState } from "react";

import {
  Action,
  ActionPanel,
  Clipboard,
  closeMainWindow,
  confirmAlert,
  Icon,
  List,
  popToRoot,
  showHUD,
} from "@raycast/api";

import * as api from "./api/alias";
import type { Alias } from "./api/alias";

const ListAliases = () => {
  const [loading, setLoading] = useState(true);
  const [filteredList, filterList] = useState<Alias[]>([]);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const allAliases = await api.get();

    filterList(allAliases);
    setLoading(false);
  };

  return (
    <List searchBarPlaceholder="Search emails and descriptions..." isLoading={loading}>
      {filteredList.map((alias) => {
        const description = alias.description || "";
        const keywords = description.split(" ");
        keywords.push(alias.email);

        return (
          <List.Item
            key={alias.id}
            title={alias.email}
            subtitle={description}
            keywords={keywords}
            accessories={[
              { tooltip: "Forwarded", text: `F: ${alias.emails_forwarded}` },
              { tooltip: "Blocked", text: `B: ${alias.emails_blocked}` },
              { tooltip: "Replied", text: `R: ${alias.emails_replied}` },
              { tooltip: "Sent", text: `S: ${alias.emails_sent}` },
            ]}
            icon={alias.active ? Icon.Envelope : Icon.LightBulbOff}
            actions={
              <ActionPanel>
                <Action
                  title="Copy to Clipboard"
                  onAction={() => {
                    Clipboard.copy(alias.email);
                    closeMainWindow();
                    showHUD("Alias copied");
                  }}
                  icon={Icon.Clipboard}
                />
                {!alias.active ? (
                  <Action
                    title="Activate"
                    onAction={async () => {
                      try {
                        await api.toggle(alias.id, true);

                        showHUD("✅ Alias activated");
                      } catch (error) {
                        showHUD("❌ Error activating alias");
                      }
                    }}
                    icon={Icon.Checkmark}
                  />
                ) : (
                  <Action
                    title="Deactivate"
                    onAction={async () => {
                      try {
                        await api.toggle(alias.id, false);

                        showHUD("✅ Alias deactivated");
                        popToRoot();
                      } catch (error) {
                        showHUD("❌ Error deactivating alias");
                      }
                    }}
                    icon={Icon.XMarkCircle}
                  />
                )}
                <Action
                  title="Delete Alias"
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  icon={Icon.Trash}
                  onAction={async () => {
                    const choice = await confirmAlert({
                      title: "Delete alias?",
                      message: "You can restore the alias in the dashboard.",
                    });

                    if (choice) {
                      try {
                        await api.remove(alias.id);

                        showHUD("✅ Alias deleted");
                        popToRoot();
                      } catch (error) {
                        showHUD("❌ Error deleting alias");
                      }
                    }
                  }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
};

export default ListAliases;
