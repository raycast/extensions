import { Action, Icon } from "@raycast/api";
import { AnswerModelPicker } from "./answer-model-picker";

/**
 * Opens the Answer Model picker; the choice reaches every open screen through `useAnswerModel`.
 * Pass `withShortcut={false}` when it's one of a panel's first two actions: Raycast gives those
 * ↵ and ⌘↵ and hides any shortcut of their own.
 */
export function ChangeModelAction({ withShortcut = true }: { withShortcut?: boolean }) {
  return (
    <Action.Push
      title="Change Answer Model"
      icon={Icon.ComputerChip}
      shortcut={withShortcut ? { modifiers: ["cmd", "shift"], key: "m" } : undefined}
      target={<AnswerModelPicker />}
    />
  );
}
