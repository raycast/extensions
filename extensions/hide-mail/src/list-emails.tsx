import { Action, ActionPanel, Clipboard, closeMainWindow, Icon, List, popToRoot, showHUD } from "@raycast/api";

import { useEffect, useState } from "react";
import { emailObject, listAllAliases } from "./utils/list";
import { toggleAlias } from "./utils/toggle";

const ListEmails = () => {
  const [loading, setLoading] = useState(true);
  const [filteredList, filterList] = useState<emailObject[]>([]);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const allAliases = await listAllAliases();

    filterList(allAliases);
    setLoading(false);
  };

  return (
    <List searchBarPlaceholder="Search emails and notes..." isLoading={loading}>
      {filteredList.map((alias) => {
        const note = alias.note || "";
        const keywords = note.split(" ");
        keywords.push(alias.email);

        return (
          <List.Item
            key={alias.email}
            title={alias.email}
            subtitle={note}
            keywords={keywords}
            accessories={[
              { tooltip: "Forwarded", text: `F: ${alias.total_forwarded}` },
              { tooltip: "Blocked", text: `B: ${alias.total_blocked}` },
            ]}
            icon={alias.is_active ? Icon.Envelope : Icon.LightBulbOff}
            actions={
              <ActionPanel>
                <Action
                  title="Copy to Clipboard"
                  onAction={() => {
                    Clipboard.copy(alias.email);
                    closeMainWindow();
                    showHUD("Copied email to clipboard!");
                  }}
                  icon={Icon.Clipboard}
                />
                {!alias.is_active ? (
                  <Action
                    title="Activate"
                    onAction={async () => {
                      const success = await toggleAlias(alias.email, true);

                      if (success) {
                        showHUD("✅ Email activated");
                      } else {
                        showHUD("❌ Error activating email");
                      }
                    }}
                    icon={Icon.Checkmark}
                  />
                ) : (
                  <Action
                    title="Deactivate"
                    onAction={async () => {
                      const success = await toggleAlias(alias.email, false);

                      if (success) {
                        showHUD("✅ Email deactivated");
                        popToRoot();
                      } else {
                        showHUD("❌ Error deactivating email");
                      }
                    }}
                    icon={Icon.XMarkCircle}
                  />
                )}
                {}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
};

export default ListEmails;
