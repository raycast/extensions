import { Alert, confirmAlert, Icon, showToast, Toast } from "@raycast/api";
import {
  getRecoveryHint,
  getUserFacingErrorMessage,
  permanentlyDeleteCard,
  RaycastApiError,
  type RaycastCard,
  restoreCard,
  softDeleteCard,
} from "./api";

const failureMessage = (error: unknown): string => {
  const hint = getRecoveryHint(error);
  return hint
    ? `${getUserFacingErrorMessage(error)} ${hint}`
    : getUserFacingErrorMessage(error);
};

const isGone = (error: unknown) =>
  error instanceof RaycastApiError && error.code === "NOT_FOUND";

export const moveCardToTrash = async (
  card: RaycastCard,
  handlers: {
    onRemoved: (cardId: string) => void;
    onRestored: (card: RaycastCard) => void;
  },
): Promise<boolean> => {
  handlers.onRemoved(card.id);
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Moving to Trash…",
  });
  try {
    await softDeleteCard(card.id, "interactive");
  } catch (error) {
    if (isGone(error)) {
      toast.style = Toast.Style.Success;
      toast.title = "Card already removed";
      return true;
    }
    handlers.onRestored(card);
    toast.style = Toast.Style.Failure;
    toast.title = "Couldn't move to Trash";
    toast.message = failureMessage(error);
    return false;
  }
  toast.style = Toast.Style.Success;
  toast.title = "Moved to Trash";
  toast.primaryAction = {
    title: "Undo",
    shortcut: { modifiers: ["cmd"], key: "z" },
    onAction: async (current) => {
      current.hide();
      try {
        await restoreCard(card.id, "interactive");
        handlers.onRestored(card);
        await showToast({ style: Toast.Style.Success, title: "Restored" });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Couldn't restore",
          message: failureMessage(error),
        });
      }
    },
  };
  return true;
};

export const restoreFromTrash = async (
  card: RaycastCard,
  onRestored: (cardId: string) => void,
): Promise<boolean> => {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Restoring…",
  });
  try {
    await restoreCard(card.id, "interactive");
    onRestored(card.id);
    toast.style = Toast.Style.Success;
    toast.title = "Restored";
    return true;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Couldn't restore";
    toast.message = failureMessage(error);
    return false;
  }
};

export const deleteCardForever = async (
  card: RaycastCard,
  onDeleted: (cardId: string) => void,
): Promise<boolean> => {
  const confirmed = await confirmAlert({
    icon: Icon.Trash,
    message: "This removes the card and its files. You can't undo it.",
    primaryAction: { style: Alert.ActionStyle.Destructive, title: "Delete" },
    title: "Delete Forever?",
  });
  if (!confirmed) {
    return false;
  }
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Deleting…",
  });
  try {
    await permanentlyDeleteCard(card.id, "interactive");
  } catch (error) {
    if (!isGone(error)) {
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn't delete";
      toast.message = failureMessage(error);
      return false;
    }
  }
  onDeleted(card.id);
  toast.style = Toast.Style.Success;
  toast.title = "Deleted forever";
  return true;
};
