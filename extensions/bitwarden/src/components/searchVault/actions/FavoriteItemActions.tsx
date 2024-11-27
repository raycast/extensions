import { Action, Icon, Toast, showToast } from "@raycast/api";
import { useSelectedVaultItem } from "~/components/searchVault/context/vaultItem";
import { useFavoritesContext } from "~/context/favorites";
import { captureException } from "~/utils/development";

function FavoriteItemActions() {
  const selectedItem = useSelectedVaultItem();
  const { favoriteOrder, toggleFavorite, moveFavorite } = useFavoritesContext();

  const isBitwardenFavorite = selectedItem.favorite;
  const isLocalFavorite = favoriteOrder.includes(selectedItem.id);

  const handleToggleFavorite = async () => {
    try {
      await toggleFavorite(selectedItem);
    } catch (error) {
      await showToast(Toast.Style.Failure, "Failed to toggle favorite ☹️");
      captureException("Failed to toggle favorite", error);
    }
  };

  const handleMoveFavorite = (dir: "up" | "down") => () => moveFavorite(selectedItem, dir);

  return (
    <>
      {!isBitwardenFavorite && (
        <Action
          title={isLocalFavorite ? "Remove Favorite" : "Mark As Favorite"}
          onAction={handleToggleFavorite}
          icon={isLocalFavorite ? Icon.StarDisabled : Icon.Star}
          shortcut={{ key: "f", modifiers: ["cmd"] }}
        />
      )}
      {(isBitwardenFavorite || isLocalFavorite) && (
        <>
          <Action
            title="Move Favorite Up"
            onAction={handleMoveFavorite("up")}
            icon={Icon.ArrowUpCircleFilled}
            shortcut={{ key: "arrowUp", modifiers: ["cmd", "shift"] }}
          />
          <Action
            title="Move Favorite Down"
            onAction={handleMoveFavorite("down")}
            icon={Icon.ArrowDownCircleFilled}
            shortcut={{ key: "arrowDown", modifiers: ["cmd", "shift"] }}
          />
        </>
      )}
    </>
  );
}

export default FavoriteItemActions;
