import { useMemo } from "react";
import { ActionContext, ActionGroups, ShowCondition } from "@/types/actions";

function shouldShowAction(showCondition: ShowCondition, context: ActionContext): boolean {
  switch (showCondition) {
    case "always":
      return true;
    case "hasVariants":
      return context.hasVariants;
    case "hasFormValues":
      return context.hasFormValues;
    case "hasCustomContent":
      return context.hasCustomContent;
    case "isProcessing":
      return context.isProcessing;
    case "hasSelection":
      return context.hasSelection;
    case "advanced":
      return context.showAdvanced;
    default:
      return false;
  }
}

function filterActionsByVisibility<T extends { showWhen: ShowCondition }>(actions: T[], context: ActionContext): T[] {
  return actions.filter((action) => shouldShowAction(action.showWhen, context));
}

export function useActionVisibility(actionGroups: ActionGroups, context: ActionContext): ActionGroups {
  return useMemo(() => {
    return {
      primary: filterActionsByVisibility(actionGroups.primary, context),
      copy: filterActionsByVisibility(actionGroups.copy, context),
      generate: filterActionsByVisibility(actionGroups.generate, context),
      secondary: filterActionsByVisibility(actionGroups.secondary, context),
      management: filterActionsByVisibility(actionGroups.management, context),
      destructive: filterActionsByVisibility(actionGroups.destructive, context),
    };
  }, [actionGroups, context]);
}

export function hasVisibleActions<T extends { showWhen: ShowCondition }>(
  actions: T[],
  context: ActionContext
): boolean {
  return actions.some((action) => shouldShowAction(action.showWhen, context));
}
