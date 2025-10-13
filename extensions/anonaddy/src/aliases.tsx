import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Icon,
  List,
  Toast,
  closeMainWindow,
  confirmAlert,
  popToRoot,
  showHUD,
  showToast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

import * as api from "./api";
import EditAlias from "./edit-alias";
import useAliases from "./useAliases";

const Aliases = () => {
  const { data: list = [], isLoading, revalidate } = useAliases();
  const navigation = useNavigation();

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search emails and descriptions...">
      {list.map((alias) => {
        const description = alias.description || "";
        const keywords = [alias.email, ...description.split(" ")];

        return (
          <List.Item
            key={alias.id}
            accessories={[
              {
                icon: Icon.Envelope,
                text: `${alias.emails_forwarded} | ${alias.emails_blocked}`,
                tooltip: "Forwarded | Blocked",
              },
              {
                icon: Icon.TextInput,
                text: `${alias.emails_replied} | ${alias.emails_sent}`,
                tooltip: "Replied | Sent",
              },
              ...alias.recipients.map((recipient) => ({ tag: recipient.email })),
            ]}
            actions={
              <ActionPanel>
                <Action
                  icon={Icon.Clipboard}
                  title="Copy to Clipboard"
                  onAction={async () => {
                    await Clipboard.copy(alias.email);
                    await showHUD("Alias copied");
                    await popToRoot();
                  }}
                />
                <Action
                  icon={alias.active ? Icon.XMarkCircle : Icon.CheckCircle}
                  title={alias.active ? "Deactivate" : "Activate"}
                  onAction={async () => {
                    try {
                      await api.alias.toggle(alias.id, !alias.active);

                      await showHUD(`✅ Alias ${alias.active ? "deactivated" : "activated"}`);
                      await closeMainWindow();
                    } catch (error) {
                      await showFailureToast(error, { title: "Error toggling alias" });
                    }
                  }}
                />
                <Action
                  icon={Icon.Pencil}
                  shortcut={{ key: "enter", modifiers: ["cmd", "shift"] }}
                  title="Edit"
                  onAction={() => {
                    navigation.push(<EditAlias id={alias.id} />);
                  }}
                />
                <Action
                  icon={Icon.Trash}
                  shortcut={{ key: "x", modifiers: ["ctrl"] }}
                  title="Delete Alias"
                  onAction={async () => {
                    const choice = await confirmAlert({
                      message: "You can restore the alias in the dashboard.",
                      title: "Delete alias?",
                    });

                    if (choice) {
                      const toast = await showToast({
                        style: Toast.Style.Animated,
                        title: "Deleting alias...",
                      });

                      try {
                        await api.alias.remove(alias.id);

                        toast.style = Toast.Style.Success;
                        toast.title = "Alias deleted";

                        revalidate();
                      } catch (error) {
                        toast.style = Toast.Style.Failure;
                        toast.title = "Error deleting alias";
                        toast.message = (error as Error).message;
                      }
                    }
                  }}
                />
              </ActionPanel>
            }
            icon={{
              source: alias.active ? Icon.CircleProgress100 : Icon.Circle,
              tintColor: alias.active ? Color.Green : Color.Red,
            }}
            keywords={keywords}
            subtitle={description}
            title={alias.email}
          />
        );
      })}
    </List>
  );
};

export default Aliases;
