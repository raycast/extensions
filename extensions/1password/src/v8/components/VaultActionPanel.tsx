import { Action, ActionPanel, Icon, useNavigation } from "@raycast/api";
import { User, Vault } from "../types";
import { SwitchAccount } from "./ActionSwitchAccount";
import { Items } from "./Items";

export function VaultActionPanel({ account, vault }: { account: User | undefined; vault: Vault }) {
  const { push } = useNavigation();
  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action
          title="Enter Vault"
          icon={Icon.Trash}
          onAction={() => push(<Items flags={[`--vault=${vault.id}`]} />)}
        />
        {SwitchAccount()}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
