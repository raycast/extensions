import { List } from "@raycast/api";
import type { ChangeModelProp } from "../../type";
import { RAW_MODEL_PREFIX, shortModelName } from "../../utils/models";

/**
 * THE DROPDOWN RULE (applies to EVERY `List.Dropdown` in this extension — put new ones
 * through it before adding them):
 *
 * **Never use `storeValue`. Own the persistence and pass a controlled `value`.**
 *
 * `storeValue` restores what the dropdown VISUALLY shows on the next mount but does NOT
 * fire `onChange` for that restore. Any React state the rest of the command reads from
 * therefore keeps its initial value while the dropdown displays something else — the UI
 * lying about its own state, and in this component's case a lie with teeth: `src/ask.tsx`
 * resolves the model actually SENT TO THE API from `selectedModelId`, not from what the
 * dropdown shows. With `storeValue`, picking a preset, quitting Raycast, and reopening Ask
 * displayed the chosen preset while every request went out on the default model.
 *
 * The correct shape is `useStatusFilter` in `src/recents.tsx` and `useSelectedModel` in
 * `src/hooks/useSelectedModel.ts`: a hook reads the persisted value into state on mount
 * and writes it on change; the dropdown gets `value={state}` and no `storeValue`, so there
 * is exactly one source of truth driving both the display and the behavior.
 *
 * This rule was learned once (Recents' Status filter) and not applied to this sibling —
 * which is why it now lives on the shared component rather than only in `recents.tsx`.
 */
export const ModelDropdown = (props: ChangeModelProp) => {
  const { models, onModelChange, selectedModel, availableModels = [] } = props;
  const customPresets = models.filter((x) => x.id !== "default");
  const defaultModel = models.find((x) => x.id === "default");

  return (
    // Controlled (`value`, no `storeValue`) — see THE DROPDOWN RULE above.
    <List.Dropdown tooltip="Select Model" value={selectedModel} onChange={onModelChange}>
      <List.Dropdown.Section title="Presets">
        {defaultModel && (
          <List.Dropdown.Item key={defaultModel.id} title={shortModelName(defaultModel.name)} value={defaultModel.id} />
        )}
        {customPresets.map((model) => (
          <List.Dropdown.Item key={model.id} title={shortModelName(model.name)} value={model.id} />
        ))}
      </List.Dropdown.Section>
      {availableModels.length > 0 && (
        <List.Dropdown.Section title="Models">
          {availableModels.map((model) => (
            <List.Dropdown.Item
              key={`${RAW_MODEL_PREFIX}${model.id}`}
              title={shortModelName(model.display_name)}
              value={`${RAW_MODEL_PREFIX}${model.id}`}
            />
          ))}
        </List.Dropdown.Section>
      )}
    </List.Dropdown>
  );
};
