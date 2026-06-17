import {
  Action,
  ActionPanel,
  Clipboard,
  closeMainWindow,
  Icon,
  List,
  popToRoot,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";

import { listAllAliases } from "./utils/list";
import { toggleAlias } from "./utils/toggle";
import { useCachedPromise } from "@raycast/utils";

const ListEmails = () => {
  const {
    isLoading,
    data: filteredList,
    revalidate,
  } = useCachedPromise(listAllAliases, [], { initialData: [], failureToastOptions: { title: "Error listing" } });

  return (
    <List searchBarPlaceholder="Search emails and notes..." isLoading={isLoading}>
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

                      const toast = await showToast(Toast.Style.Animated, "🔄 Activating", alias.email);
                      if (success) {
                        toast.style = Toast.Style.Success;
                        toast.title = "✅ Email activated";
                        revalidate();
                      } else {
                        toast.style = Toast.Style.Failure;
                        toast.title = "❌ Error activating email";
                      }
                    }}
                    icon={Icon.Checkmark}
                  />
                ) : (
                  <Action
                    title="Deactivate"
                    onAction={async () => {
                      const success = await toggleAlias(alias.email, false);

                      const toast = await showToast(Toast.Style.Animated, "🔄 Deactivating", alias.email);
                      if (success) {
                        toast.style = Toast.Style.Success;
                        toast.title = "✅ Email deactivated";
                        revalidate();
                      } else {
                        toast.style = Toast.Style.Failure;
                        toast.title = "❌ Error deactivating email";
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
