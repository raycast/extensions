import { Action, ActionPanel, Icon, useNavigation } from "@raycast/api";

import { User, Vault } from "../types";
import { SwitchAccount } from "./ActionSwitchAccount";
import { Items } from "./Items";

export function VaultActionPanel({ vault }: { account: undefined | User; vault: Vault }) {
  const { push } = useNavigation();

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action
          icon={Icon.Folder}
          onAction={() => push(<Items flags={[`--vault=${vault.id}`]} />)}
          title="Enter Vault"
        />
        {SwitchAccount()}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
