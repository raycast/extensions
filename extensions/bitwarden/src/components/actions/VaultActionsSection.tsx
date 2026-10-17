import { Action, ActionPanel, Color, Icon, showToast, Toast } from "@raycast/api";
import { VAULT_LOCK_MESSAGES } from "~/constants/general";
import { useBitwarden } from "~/context/bitwarden";
import { useVaultContext } from "~/context/vault";

export function VaultActionsSection() {
  const vault = useVaultContext();
  const bitwarden = useBitwarden();

  const handleLockVault = async () => {
    const toast = await showToast({ title: "Locking vault...", message: "Please wait", style: Toast.Style.Animated });
    try {
      await bitwarden.lock({ reason: VAULT_LOCK_MESSAGES.MANUAL });
      toast.style = Toast.Style.Success;
      toast.title = "Vault Locked";
      toast.message = undefined;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to lock vault";
      toast.message = undefined;
    }
  };

  const handleLogoutVault = async () => {
    const toast = await showToast({ title: "Logging out...", message: "Please wait", style: Toast.Style.Animated });
    try {
      await bitwarden.logout();
      toast.style = Toast.Style.Success;
      toast.title = "Logged Out";
      toast.message = undefined;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to logout";
      toast.message = undefined;
    }
  };

  return (
    <ActionPanel.Section title="Vault Actions">
      <Action
        title="Sync Vault"
        shortcut={{ macOS: { key: "r", modifiers: ["opt"] }, Windows: { key: "r", modifiers: ["alt"] } }}
        icon={Icon.ArrowClockwise}
        onAction={vault.syncItems}
      />
      <Action
        icon={{ source: "sf_symbols_lock.svg", tintColor: Color.PrimaryText }} // Does not immediately follow theme
        title="Lock Vault"
        shortcut={{
          macOS: { key: "l", modifiers: ["opt", "shift"] },
          Windows: { key: "l", modifiers: ["alt", "shift"] },
        }}
        onAction={handleLockVault}
      />
      <Action style={Action.Style.Destructive} title="Logout" icon={Icon.Logout} onAction={handleLogoutVault} />
    </ActionPanel.Section>
  );
}
