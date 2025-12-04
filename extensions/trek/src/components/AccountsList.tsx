import { List, ActionPanel, Action, showToast, Toast, Icon } from "@raycast/api";
import ProjectsList from "./ProjectsList";
import { showFailureToast, useLocalStorage } from "@raycast/utils";
import { ReactNode } from "react";

interface Account {
  id: number;
  name: string;
}

interface BasecampsListProps {
  accounts: Account[];
  isLoading: boolean;
  actions?: ReactNode;
}

export function BasecampsList({ accounts, isLoading, actions }: BasecampsListProps) {
  const { value: defaultBasecampConfig, setValue, removeValue } = useLocalStorage<string>("defaultBasecampConfig", "");

  const setDefaultBasecamp = async (accountId: number, accountName: string) => {
    try {
      const configValue = `${accountId}|${accountName}`;
      await setValue(configValue);
      showToast({ title: "Default Basecamp Set", style: Toast.Style.Success });
    } catch (error) {
      showFailureToast(error, { title: "Error setting default basecamp" });
    }
  };

  const removeDefaultBasecamp = async () => {
    await removeValue();
    showToast({ title: "Default Basecamp Removed", style: Toast.Style.Success });
  };

  const defaultBasecamp = defaultBasecampConfig?.split("|");
  const defaultBasecampId = defaultBasecamp?.[0] ?? "";

  const isDefaultBasecamp = (accountId: number) => {
    return defaultBasecampId === accountId.toString();
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search accounts...">
      {accounts?.map((account) => (
        <List.Item
          key={account.id}
          title={`${account.name}`}
          accessories={isDefaultBasecamp(account.id) ? [{ icon: Icon.Star }] : []}
          actions={
            <ActionPanel>
              <Action.Push
                title="Select Account"
                target={<ProjectsList accountId={account.id} accountName={account.name} />}
              />
              <Action title="Set Default Basecamp" onAction={() => setDefaultBasecamp(account.id, account.name)} />
              {defaultBasecampId && <Action title="Remove Default Basecamp" onAction={() => removeDefaultBasecamp()} />}
              {actions}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
