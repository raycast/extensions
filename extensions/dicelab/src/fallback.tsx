// Fallback command - detects dice expressions from root search

import { LaunchType, List, LaunchProps } from "@raycast/api";
import React from "react";
import RollCommand from "./roll";

export default function FallbackCommand(props: LaunchProps) {
  const fallbackText =
    props.fallbackText ?? props.launchContext?.fallbackText ?? "";

  // If the fallback text looks like a dice expression, evaluate it
  const isDiceExpression = /\d*d\d+|d20|d100|analyze/i.test(fallbackText);

  if (isDiceExpression && fallbackText.trim()) {
    return (
      <RollCommand
        launchType={LaunchType.UserInitiated}
        arguments={{ expression: fallbackText }}
      />
    );
  }

  // Otherwise, show empty state
  return (
    <List>
      <List.EmptyView
        title="Not a Dice Expression"
        description='Try "d20", "2d6+4", or use the Roll Dice command'
      />
    </List>
  );
}
