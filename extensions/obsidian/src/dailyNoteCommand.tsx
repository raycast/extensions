import { Action, ActionPanel, closeMainWindow, List, open, popToRoot } from "@raycast/api";

import { getObsidianTarget, ObsidianTargetType } from "./utils/utils";
import { NoVaultFoundMessage } from "./components/Notifications/NoVaultFoundMessage";
import { useObsidianVaults } from "./utils/hooks";

export default function Command() {
  const { vaults, ready } = useObsidianVaults();

  if (!ready) {
    return <List isLoading={true}></List>;
  } else if (vaults.length === 0) {
    return <NoVaultFoundMessage />;
  }

  if (vaults.length == 1) {
    const target = getObsidianTarget({ type: ObsidianTargetType.DailyNote, vault: vaults[0] });
    open(target);
    popToRoot();
    closeMainWindow();
  }

  return (
    <List isLoading={vaults === undefined}>
      {vaults?.map((vault) => (
        <List.Item
          title={vault.name}
          key={vault.key}
          actions={
            <ActionPanel>
              <Action.Open
                title="Daily Note"
                target={getObsidianTarget({ type: ObsidianTargetType.DailyNote, vault: vault })}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
