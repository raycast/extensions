import { Action, Icon, Toast, showToast } from "@raycast/api";
import { useSelectedVaultItem } from "~/components/searchVault/context/vaultItem";
import { useBitwarden } from "~/context/bitwarden";
import { captureException } from "~/utils/development";

function FavoriteItemAction() {
  const selectedItem = useSelectedVaultItem();
  const bitwarden = useBitwarden();

  const toggleFavorite = async () => {
    const toast = await showToast(Toast.Style.Animated, "Marking as favorite...");
    try {
      await bitwarden.editItem({ ...selectedItem, favorite: !selectedItem.favorite });
      toast.title = "Marked as favorite";
      toast.style = Toast.Style.Success;
    } catch (error) {
      toast.title = "Failed to mark as favorite";
      toast.style = Toast.Style.Failure;
      captureException("Failed to mark as favorite", error);
    }
  };

  return (
    <Action
      title="Mark As Favorite"
      onAction={toggleFavorite}
      icon={selectedItem.favorite ? Icon.StarDisabled : Icon.Star}
    />
  );
}

export default FavoriteItemAction;
