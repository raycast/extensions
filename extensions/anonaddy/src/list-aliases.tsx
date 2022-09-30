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

import { useEffect, useState } from "react";
import { deleteAlias } from "./utils/delete";
import { aliasObject, listAllAliases } from "./utils/list";
import { toggleAlias } from "./utils/toggle";

const ListAliases = () => {
  const [loading, setLoading] = useState(true);
  const [filteredList, filterList] = useState<aliasObject[]>([]);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const allAliases = await listAllAliases();

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
                      const success = await toggleAlias(alias.id, true);

                      if (success) {
                        showHUD("✅ Alias activated");
                      } else {
                        showHUD("❌ Error activating alias");
                      }
                    }}
                    icon={Icon.Checkmark}
                  />
                ) : (
                  <Action
                    title="Deactivate"
                    onAction={async () => {
                      const success = await toggleAlias(alias.id, false);

                      if (success) {
                        showHUD("✅ Alias deactivated");
                        popToRoot();
                      } else {
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
                      const success = await deleteAlias(alias.id);

                      if (success) {
                        showHUD("✅ Alias deleted");
                        popToRoot();
                      } else {
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
