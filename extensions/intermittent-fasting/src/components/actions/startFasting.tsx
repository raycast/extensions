import { Action, Icon } from "@raycast/api";
import { FC } from "react";
import { EnhancedItem } from "../../types";

interface StartFastingProps {
  startItem: () => Promise<EnhancedItem[]>;
  revalidate: () => Promise<EnhancedItem[]>;
}

export const StartFasting: FC<StartFastingProps> = ({ startItem, revalidate }) => {
  return (
    <Action
      title="Start Fasting"
      icon={Icon.Clock}
      onAction={async () => {
        await startItem();
        await revalidate();
      }}
      shortcut={{ modifiers: ["cmd"], key: "s" }}
    />
  );
};
