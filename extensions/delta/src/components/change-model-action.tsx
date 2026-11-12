import { Action, Icon } from "@raycast/api";
import { AnswerModelPicker } from "./answer-model-picker";

/** Opens the Answer Model picker; the choice reaches every open screen through `useAnswerModel`. */
export function ChangeModelAction() {
  return (
    <Action.Push
      title="Change Answer Model"
      icon={Icon.ComputerChip}
      shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
      target={<AnswerModelPicker />}
    />
  );
}
