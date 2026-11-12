import { Icon, List } from "@raycast/api";
import { useAnswerModel } from "../hooks/use-answer-model";
import { useUsedModels } from "../hooks/use-used-models";

// List.Dropdown values must be non-empty strings.
const DEFAULT_VALUE = "default";

/** Search bar dropdown that shows and changes the answer model where a question is asked. */
export function AnswerModelDropdown() {
  const { model, setModel, isLoading } = useAnswerModel();
  const { data: usedModels } = useUsedModels();
  const current = model ?? DEFAULT_VALUE;

  // Rendering before the stored value loads would show Delta's default and overwrite the choice.
  if (isLoading) {
    return null;
  }

  const ids = (usedModels ?? []).map((usage) => usage.id);
  // Keep a custom model chosen earlier selectable even if no recent thread used it.
  if (model && !ids.includes(model)) {
    ids.unshift(model);
  }

  return (
    <List.Dropdown
      tooltip="Answer Model"
      value={current}
      onChange={(value) => {
        // Raycast also calls onChange on mount; only save real changes.
        if (value !== current) {
          setModel(value === DEFAULT_VALUE ? undefined : value);
        }
      }}
    >
      <List.Dropdown.Item title="Delta's Default" value={DEFAULT_VALUE} icon={Icon.Stars} />
      {ids.length > 0 && (
        <List.Dropdown.Section title="Used in Your Threads">
          {ids.map((id) => (
            <List.Dropdown.Item key={id} title={id} value={id} icon={Icon.ComputerChip} />
          ))}
        </List.Dropdown.Section>
      )}
    </List.Dropdown>
  );
}
