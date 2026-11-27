import { showToast, Toast } from "@raycast/api";
import {
  getRecoveryHint,
  getUserFacingErrorMessage,
  type RaycastCard,
  refreshCard,
  setCardArchived,
  setCardDone,
} from "./api";
import { doneToastTitle } from "./doneStates";

export const failureMessage = (error: unknown): string => {
  const hint = getRecoveryHint(error);
  return hint
    ? `${getUserFacingErrorMessage(error)} ${hint}`
    : getUserFacingErrorMessage(error);
};

export const archiveCard = async (
  card: RaycastCard,
  onUpdated: (card: RaycastCard) => void,
): Promise<boolean> => {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Archiving…",
  });
  try {
    onUpdated(await setCardArchived(card.id, true, "interactive"));
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Couldn't archive";
    toast.message = failureMessage(error);
    return false;
  }
  toast.style = Toast.Style.Success;
  toast.title = "Archived";
  toast.primaryAction = {
    title: "Undo",
    shortcut: { modifiers: ["cmd"], key: "z" },
    onAction: async (current) => {
      current.hide();
      try {
        onUpdated(await setCardArchived(card.id, false, "interactive"));
        await showToast({ style: Toast.Style.Success, title: "Unarchived" });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Couldn't unarchive",
          message: failureMessage(error),
        });
      }
    },
  };
  return true;
};

export const unarchiveCard = async (
  card: RaycastCard,
  onUpdated: (card: RaycastCard) => void,
): Promise<boolean> => {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Unarchiving…",
  });
  try {
    onUpdated(await setCardArchived(card.id, false, "interactive"));
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Couldn't unarchive";
    toast.message = failureMessage(error);
    return false;
  }
  toast.style = Toast.Style.Success;
  toast.title = "Unarchived";
  return true;
};

export const toggleCardDone = async (
  card: RaycastCard,
  done: boolean,
  onUpdated: (card: RaycastCard) => void,
): Promise<boolean> => {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Updating…",
  });
  try {
    const updated = await setCardDone(card.id, done, "interactive");
    onUpdated(updated);
    toast.style = Toast.Style.Success;
    toast.title = doneToastTitle(updated);
    return true;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Couldn't update";
    toast.message = failureMessage(error);
    return false;
  }
};

export const refreshCardDetails = async (card: RaycastCard): Promise<void> => {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Refreshing…",
  });
  try {
    await refreshCard(card.id, "interactive");
    toast.style = Toast.Style.Success;
    toast.title = "Refreshing details";
    toast.message = "The summary, tags and preview update in a moment.";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Couldn't refresh";
    toast.message = failureMessage(error);
  }
};
