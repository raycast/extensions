import { confirmAlert, Alert, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { deleteBoxCached, emptyBoxCached } from "../api/cached";
import { getErrorMessage } from "../utils/error-handler";
import { formatCurrency } from "../utils/format";
import { SUCCESS_MESSAGES } from "../constants";
import type { Box, EmptyBoxResponse } from "../types";

interface BoxActionCallbacks {
  onBeforeStart?: () => void;
  onError?: () => void;
}

/**
 * Confirm and delete a box with consistent alert and toast feedback
 */
export async function confirmAndDeleteBox(
  box: Box,
  callbacks: BoxActionCallbacks & { onDeleted?: () => Promise<void> | void } = {},
): Promise<boolean> {
  const confirmed = await confirmAlert({
    title: "Delete Box",
    message: `Are you sure you want to delete "${box.name}"? This will also delete all ${box.count} sadaqahs in this box.`,
    primaryAction: {
      title: "Delete",
      style: Alert.ActionStyle.Destructive,
    },
  });

  if (!confirmed) {
    return false;
  }

  try {
    callbacks.onBeforeStart?.();
    await deleteBoxCached(box.id);

    await showToast({
      style: Toast.Style.Success,
      title: SUCCESS_MESSAGES.BOX_DELETED,
    });

    await callbacks.onDeleted?.();
    return true;
  } catch (error) {
    await showFailureToast(new Error(getErrorMessage(error)), {
      title: "Failed to delete box",
    });
    callbacks.onError?.();
    return false;
  }
}

/**
 * Confirm and collect (empty) a box with consistent alert and toast feedback
 */
export async function confirmAndCollectBox(
  box: Box,
  callbacks: BoxActionCallbacks & { onCollected?: (response: EmptyBoxResponse) => Promise<void> | void } = {},
): Promise<boolean> {
  if (box.count === 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Box is already empty",
    });
    return false;
  }

  const confirmed = await confirmAlert({
    title: "Collect Box",
    message: `Are you sure you want to collect "${box.name}"? This will collect all ${box.count} sadaqahs (${formatCurrency(box.totalValue, box.baseCurrency)}).`,
    primaryAction: {
      title: "Collect Box",
      style: Alert.ActionStyle.Default,
    },
  });

  if (!confirmed) {
    return false;
  }

  try {
    callbacks.onBeforeStart?.();
    const response = await emptyBoxCached(box.id);

    await showToast({
      style: Toast.Style.Success,
      title: "Box collected successfully",
    });

    await callbacks.onCollected?.(response);
    return true;
  } catch (error) {
    await showFailureToast(new Error(getErrorMessage(error)), {
      title: "Failed to collect box",
    });
    callbacks.onError?.();
    return false;
  }
}
