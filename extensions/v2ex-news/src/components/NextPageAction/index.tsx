import { ActionPanel } from "@raycast/api";
import React from "react";
import { cmdRight } from "@/shortcut";

export default (props: { onSelect: () => void }) => {
  return (
    <ActionPanel.Item icon={cmdRight.icon} title={cmdRight.title} shortcut={cmdRight.key} onAction={props.onSelect} />
  );
};
