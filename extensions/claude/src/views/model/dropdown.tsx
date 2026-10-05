import { List } from "@raycast/api";
import { useRef } from "react";
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
/**
 * THE MOUNT RULE. When it mounts, Raycast's dropdown fires `onChange` with its FIRST item,
 * ignoring `value` (observed in the Osaurus extension, which hit the same lost-pick bug).
 * `onChange` persists the pick, so a saved pick that was not first was overwritten on every
 * launch. The selected item therefore renders first: its section leads, and it leads its
 * section. The mount-time `onChange` then re-selects the pick that was already saved.
 *
 * The caller must also not mount this before the saved pick has been read and the items
 * that name it have loaded (`src/ask.tsx`).
 */
export const ModelDropdown = (props: ChangeModelProp) => {
  const { models, onModelChange, selectedModel, availableModels: liveModels = [] } = props;
  // Ordered by the pick the dropdown MOUNTED with, frozen — the order only has to protect the
  // mount. Re-sorting on every selection made the list jump under the user's cursor.
  const startModel = useRef(selectedModel).current;
  // A saved bare-model pick the live list does not contain (the fetch failed, or the list
  // is still the hardcoded fallback) keeps an entry of its own. Otherwise the first item
  // would be selected at mount and replace a pick the request path can still resolve.
  const startRawId = startModel.startsWith(RAW_MODEL_PREFIX) ? startModel.slice(RAW_MODEL_PREFIX.length) : undefined;
  const availableModels =
    startRawId && !liveModels.some((model) => model.id === startRawId)
      ? [{ id: startRawId, display_name: startRawId, created_at: "" }, ...liveModels]
      : liveModels;
  const selectedFirst = <T,>(items: T[], idOf: (item: T) => string) => [
    ...items.filter((item) => idOf(item) === startModel),
    ...items.filter((item) => idOf(item) !== startModel),
  ];
  const defaultModel = models.find((x) => x.id === "default");
  const presets = selectedFirst(
    [...(defaultModel ? [defaultModel] : []), ...models.filter((x) => x.id !== "default")],
    (model) => model.id,
  );
  const rawModels = selectedFirst(availableModels, (model) => `${RAW_MODEL_PREFIX}${model.id}`);

  const presetSection = (
    <List.Dropdown.Section key="presets" title="Presets">
      {presets.map((model) => (
        <List.Dropdown.Item key={model.id} title={shortModelName(model.name)} value={model.id} />
      ))}
    </List.Dropdown.Section>
  );
  const modelSection = availableModels.length > 0 && (
    <List.Dropdown.Section key="models" title="Models">
      {rawModels.map((model) => (
        <List.Dropdown.Item
          key={`${RAW_MODEL_PREFIX}${model.id}`}
          title={shortModelName(model.display_name)}
          value={`${RAW_MODEL_PREFIX}${model.id}`}
        />
      ))}
    </List.Dropdown.Section>
  );

  return (
    // Controlled (`value`, no `storeValue`) — see THE DROPDOWN RULE above.
    <List.Dropdown tooltip="Select Model" value={selectedModel} onChange={onModelChange}>
      {startModel.startsWith(RAW_MODEL_PREFIX) ? [modelSection, presetSection] : [presetSection, modelSection]}
    </List.Dropdown>
  );
};
