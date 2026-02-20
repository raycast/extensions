import { List, ActionPanel, Action, Icon, showToast, Toast, useNavigation, LocalStorage } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchRecitations } from "./lib/api";
import { Recitation } from "./types";

export default function Command() {
  const { data: recitations, isLoading } = useCachedPromise(fetchRecitations);
  const { pop } = useNavigation();

  async function handleSetDefault(recitation: Recitation) {
    try {
      await LocalStorage.setItem("defaultReciterId", recitation.id.toString());
      await LocalStorage.setItem("defaultReciterName", recitation.reciter_name);

      await showToast({
        style: Toast.Style.Success,
        title: "Default Reciter Set",
        message: `${recitation.reciter_name} (${recitation.style})`,
      });

      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to set default reciter",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search reciters...">
      {recitations?.map((recitation: Recitation) => (
        <List.Item
          key={recitation.id}
          title={recitation.reciter_name}
          subtitle={recitation.style}
          icon={Icon.Person}
          actions={
            <ActionPanel>
              <Action title="Set as Default" icon={Icon.Checkmark} onAction={() => handleSetDefault(recitation)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
