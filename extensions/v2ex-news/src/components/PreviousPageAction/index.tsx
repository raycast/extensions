import { ActionPanel } from "@raycast/api";
import React from "react";
import { cmdLeft } from "@/shortcut";

export default (props: { onSelect: () => void }) => {
  return (
    <ActionPanel.Item icon={cmdLeft.icon} title={cmdLeft.title} shortcut={cmdLeft.key} onAction={props.onSelect} />
  );
};
