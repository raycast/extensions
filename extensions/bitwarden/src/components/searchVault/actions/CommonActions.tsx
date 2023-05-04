import { Action, Color, Icon, showToast, Toast } from "@raycast/api";
import { useSession } from "~/context/session";
import { useVault } from "~/context/vault";

function SearchCommonActions() {
  const vault = useVault();
  const session = useSession();

  const handleLockVault = async () => {
    const toast = await showToast(Toast.Style.Animated, "Locking Vault...", "Please wait");
    await session.lock("Manually locked by the user");
    await toast.hide();
  };

  const handleLogoutVault = async () => {
    const toast = await showToast({ title: "Logging Out...", style: Toast.Style.Animated });
    await session.logout();
    await toast.hide();
  };

  return (
    <>
      <Action
        title="Sync Vault"
        shortcut={{ modifiers: ["cmd"], key: "r" }}
        icon={Icon.ArrowClockwise}
        onAction={vault.syncItems}
      />
      <Action
        icon={{ source: "sf_symbols_lock.svg", tintColor: Color.PrimaryText }} // Does not immediately follow theme
        title="Lock Vault"
        shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
        onAction={handleLockVault}
      />
      <Action style={Action.Style.Destructive} title="Logout" icon={Icon.Logout} onAction={handleLogoutVault} />
    </>
  );
}
export default SearchCommonActions;
