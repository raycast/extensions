import { Action, ActionPanel, Color, Detail, Icon, List, Toast, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { defaultVaultName, listVaults, setDefaultVaultName, sortVaultsForDefault, type VaultInfo } from "./tasknotes";

export default function Command() {
  const { data, error, isLoading, revalidate } = useCachedPromise(async () => {
    const [vaults, currentDefaultVault] = await Promise.all([listVaults(), defaultVaultName()]);
    const effectiveDefaultVault = currentDefaultVault || (vaults.length === 1 ? vaults[0].name : undefined);

    return {
      currentDefaultVault: effectiveDefaultVault,
      vaults: sortVaultsForDefault(vaults, effectiveDefaultVault),
    };
  });

  if (error) {
    return <Detail markdown={`# Switch Default Vault\n\n${error.message}`} />;
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search vaults...">
      {(data?.vaults ?? []).map((vault) => (
        <VaultItem
          key={vault.path}
          vault={vault}
          isDefault={vault.name === data?.currentDefaultVault}
          revalidate={revalidate}
        />
      ))}
    </List>
  );
}

function VaultItem({ vault, isDefault, revalidate }: { vault: VaultInfo; isDefault: boolean; revalidate: () => void }) {
  async function setDefault() {
    await setDefaultVaultName(vault.name);
    await showToast({
      style: Toast.Style.Success,
      title: "Default vault updated",
      message: vault.name,
    });
    revalidate();
  }

  return (
    <List.Item
      title={vault.name}
      subtitle={vault.path}
      icon={{
        source: isDefault ? Icon.CheckCircle : Icon.Circle,
        tintColor: isDefault ? Color.Green : Color.SecondaryText,
      }}
      accessories={isDefault ? [{ text: "Default" }] : []}
      actions={
        <ActionPanel>
          <Action title="Set as Default Vault" icon={Icon.CheckCircle} onAction={setDefault} />
        </ActionPanel>
      }
    />
  );
}
