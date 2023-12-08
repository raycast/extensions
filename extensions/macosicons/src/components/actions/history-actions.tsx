import {
  Action,
  ActionPanel,
  Icon,
  Keyboard,
  showToast,
  Toast,
} from "@raycast/api";
import React from "react";
import { IconStorageItem } from "../../types";
import { DB } from "../../db";

export type ActionProps = {
  bundleId: string;
  icon: IconStorageItem;
  onDeleted: () => Promise<unknown>;
};

const RemoveHistoryItem = ({ icon, onDeleted, bundleId }: ActionProps) => {
  const remove = async () => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Removing history item`,
    });

    try {
      await DB.removeFromHistory(bundleId, icon);

      onDeleted();

      toast.style = Toast.Style.Success;
      toast.title = `Successfully removed`;
    } catch (e) {
      toast.style = Toast.Style.Failure;

      toast.title = e?.toString() ?? "Something went wrong";
    }
  };
  return (
    <Action
      shortcut={Keyboard.Shortcut.Common.Remove}
      icon={Icon.Trash}
      title="Remove History Item"
      onAction={() => remove()}
    />
  );
};

export const HistoryActions = ({
  icon,
  bundleId,
  revalidate,
}: {
  icon: IconStorageItem;
  bundleId: string;
  revalidate: () => Promise<unknown>;
}) => (
  <ActionPanel.Section>
    <RemoveHistoryItem bundleId={bundleId} icon={icon} onDeleted={revalidate} />
  </ActionPanel.Section>
);
