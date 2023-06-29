import { Action, Icon, Toast, showToast } from "@raycast/api";
import { useSelectedVaultItem } from "~/components/searchVault/context/vaultItem";
import { useFavoritesContext } from "~/context/favorites";
import { captureException } from "~/utils/development";

function FavoriteItemActions() {
  const selectedItem = useSelectedVaultItem();
  const { toggleFavorite, moveFavoritePosition } = useFavoritesContext();

  const markAsFavorite = async () => {
    const toast = await showToast(Toast.Style.Animated, "Marking item as favorite...");
    try {
      await toggleFavorite(selectedItem);
      toast.style = Toast.Style.Success;
      toast.title = "Item marked as favorite";
    } catch (error) {
      captureException("Failed to mark item as favorite", error);
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to mark item as favorite";
    }
  };

  const moveFavoriteUp = () => moveFavoritePosition(selectedItem, "up");

  const moveFavoriteDown = () => moveFavoritePosition(selectedItem, "down");

  return (
    <>
      <Action
        title="Mark As Favorite"
        onAction={markAsFavorite}
        icon={selectedItem.favorite ? Icon.StarDisabled : Icon.Star}
        shortcut={{ key: "f", modifiers: ["cmd"] }}
      />
      <Action
        title="Move Favorite Up"
        onAction={moveFavoriteUp}
        icon={Icon.ArrowUpCircleFilled}
        shortcut={{ key: "arrowUp", modifiers: ["cmd", "shift"] }}
      />
      <Action
        title="Move Favorite Down"
        onAction={moveFavoriteDown}
        icon={Icon.ArrowDownCircleFilled}
        shortcut={{ key: "arrowDown", modifiers: ["cmd", "shift"] }}
      />
    </>
  );
}

export default FavoriteItemActions;
