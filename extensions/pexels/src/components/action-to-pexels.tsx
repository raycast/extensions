import { Action, Icon, open, showHUD } from "@raycast/api";
import { PEXELS_URL } from "../utils/costants";
import React from "react";

export function ActionToPexels() {
  return (
    <Action
      icon={Icon.Globe}
      title={"Go to Pexels"}
      shortcut={{ modifiers: ["shift", "cmd"], key: "p" }}
      onAction={async () => {
        await open(PEXELS_URL);
        await showHUD("View Pexels in Browser");
      }}
    />
  );
}
