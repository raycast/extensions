import { Action, Icon } from "@raycast/api";
import { FC } from "react";

interface StopFastingProps {
  stopItem: () => Promise<void>;
  revalidate: () => void;
}

export const StopFasting: FC<StopFastingProps> = ({ stopItem, revalidate }) => {
  return (
    <Action
      title="Stop Fasting"
      shortcut={{ modifiers: ["cmd"], key: "s" }}
      icon={Icon.Stop}
      onAction={async () => {
        await stopItem();
        revalidate();
      }}
    />
  );
};
