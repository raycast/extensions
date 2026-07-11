import React from "react";
import { Color } from "@raycast/api";
import { BudgetType } from "../types";
import {
  BUDGET_COLORS,
  BUDGET_DISPLAY,
  DEPRECATED_BADGE,
  NEW_BADGE,
  WARNING_BADGE,
  DEPRECATED_ICON,
} from "../utils/constants";

interface BadgeProps {
  type: "deprecated" | "new" | "budget" | "warning";
  budget?: BudgetType;
  tokens?: number;
  text?: string;
  children?: React.ReactNode;
}

export function getBadgeProps({ type, budget, tokens, text, children }: BadgeProps) {
  const createBadgeConfig = () => {
    switch (type) {
      case "deprecated":
        return {
          text: DEPRECATED_BADGE,
          icon: DEPRECATED_ICON,
        };
      case "new":
        return {
          text: NEW_BADGE,
          color: Color.Green,
        };
      case "warning":
        return {
          text: text || WARNING_BADGE,
          color: Color.Orange,
        };
      case "budget": {
        if (!budget) return null;
        const budgetInfo = BUDGET_DISPLAY[budget];
        const displayText = tokens ? `${tokens} tokens` : `${budgetInfo.label}`;
        return {
          text: (children ? String(children) : displayText) as string,
          color: BUDGET_COLORS[budget],
        };
      }
      default:
        return null;
    }
  };

  const badgeProps = createBadgeConfig();
  if (!badgeProps) return null;

  return {
    text: badgeProps.text,
    ...(badgeProps.color ? { color: badgeProps.color } : {}),
    ...(badgeProps.icon ? { icon: badgeProps.icon } : {}),
  };
}
