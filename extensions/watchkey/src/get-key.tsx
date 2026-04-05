import { Action, ActionPanel, List, showToast, Toast, Clipboard, popToRoot, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useInstallGuard } from "./install-guard";
import { watchkeyGet, watchkeyList } from "./watchkey";

export default function GetKey() {
  const { installed, installView } = useInstallGuard();
  const { data: keys, isLoading } = usePromise(watchkeyList, [], { execute: installed });

  if (!installed) return installView;

  async function handleGet(service: string) {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Retrieving secret..." });
    try {
      const value = await watchkeyGet(service);
      await Clipboard.copy(value);
      toast.style = Toast.Style.Success;
      toast.title = `Copied "${service}" to clipboard`;
      await popToRoot();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to retrieve secret";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search keys...">
      {keys?.map((key) => (
        <List.Item
          key={key}
          title={key}
          icon={Icon.Key}
          actions={
            <ActionPanel>
              <Action title="Get Secret" icon={Icon.Clipboard} onAction={() => handleGet(key)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
