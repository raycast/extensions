import { Action, Icon, Toast, showToast } from "@raycast/api";
import { useSelectedVaultItem } from "~/components/searchVault/context/vaultItem";
import { useFavoritesContext } from "~/context/favorites";
import { captureException } from "~/utils/development";

function FavoriteItemActions() {
  const selectedItem = useSelectedVaultItem();
  const { toggleFavorite, moveFavorite } = useFavoritesContext();

  const handleToggleFavorite = async () => {
    const toastMessages = getToastMessages(selectedItem.favorite);
    const toast = await showToast(Toast.Style.Animated, toastMessages.loading);
    try {
      await toggleFavorite(selectedItem);
      toast.style = Toast.Style.Success;
      toast.title = toastMessages.success;
      toast.message = "👍";
    } catch (error) {
      captureException("Failed to toggle favorite", error);
      toast.style = Toast.Style.Failure;
      toast.message = "Failed ☹️";
    }
  };

  const handleMoveFavorite = (dir: "up" | "down") => () => moveFavorite(selectedItem, dir);

  return (
    <>
      <Action
        title={selectedItem.favorite ? "Remove Favorite" : "Mark As Favorite"}
        onAction={handleToggleFavorite}
        icon={selectedItem.favorite ? Icon.StarDisabled : Icon.Star}
        shortcut={{ key: "f", modifiers: ["cmd"] }}
      />
      {selectedItem.favorite && (
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

const MESSAGES = {
  add: {
    loading: "Marking as favorite",
    success: "Marked as favorite",
  },
  remove: {
    loading: "Removing favorite",
    success: "Removed favorite",
  },
} as const;

function getToastMessages(isFavorite: boolean) {
  return isFavorite ? MESSAGES.remove : MESSAGES.add;
}

export default FavoriteItemActions;
