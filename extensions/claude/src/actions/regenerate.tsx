import { Action, ActionPanel, Icon } from "@raycast/api";
import type { AvailableModel } from "../api/models";
import { DEFAULT_MODEL } from "../hooks/useModel";
import type { Model } from "../type";
import { RAW_MODEL_PREFIX, buildRawModel, shortModelName } from "../utils/models";

/**
 * "Regenerate Answer with Preset…" / "…with Model…" — re-asks the SAME question against
 * a different preset or bare model, each opening a submenu of the available choices.
 *
 * THE APPEND RULE — append, not replace. Regenerating APPENDS a new answer to the
 * conversation rather than overwriting the existing one: nothing is destroyed, the user
 * can compare the two answers side by side, and it composes with the per-answer
 * `answer_model` accessory (`src/type.ts`, `src/views/chat.tsx`) that exists specifically
 * so two answers to the same question stay distinguishable. A replace-in-place ruling
 * would make that accessory pointless (there would only ever be one answer per question)
 * and would silently discard an answer the user might have wanted to keep. `onRegenerate`
 * below is exactly `use.chats.ask` — the same append path every other question takes.
 *
 * Reuses the same two-section shape as `src/views/model/dropdown.tsx` (saved presets,
 * then live bare models) so the submenu matches the picker the user already knows.
 * Deliberately does NOT reuse `ModelDropdown` itself — that component is a
 * `List.Dropdown`, not an `ActionPanel` item, and its controlled `value`/`onChange`
 * contract (THE DROPDOWN RULE) has no equivalent in a one-shot submenu selection.
 */
export const RegenerateActionSection = ({
  question,
  models,
  availableModels = [],
  onRegenerate,
}: {
  /** The question being re-asked. Both submenus are hidden when this is empty — there is
   *  nothing to regenerate an answer FOR until a question exists. */
  question: string;
  models: Model[];
  availableModels?: AvailableModel[];
  /** Called with the resolved `Model` to ask `question` again with. */
  onRegenerate: (model: Model) => void;
}) => {
  if (!question) return null;

  const customPresets = models.filter((x) => x.id !== "default");
  const defaultModel = models.find((x) => x.id === "default");
  // Same fallback `buildRawModel` uses everywhere else (`ModelForm`'s default option,
  // `useAskConversation`'s raw-selection resolution): the built-in preset when the store
  // has loaded one, else the shipped `DEFAULT_MODEL` constant.
  const rawModelDefaults = defaultModel ?? DEFAULT_MODEL;

  return (
    <ActionPanel.Section title="Regenerate">
      <ActionPanel.Submenu
        title="Regenerate Answer with Preset…"
        icon={Icon.RotateClockwise}
        shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
      >
        {defaultModel && (
          <Action
            key={defaultModel.id}
            title={shortModelName(defaultModel.name)}
            onAction={() => onRegenerate(defaultModel)}
          />
        )}
        {customPresets.map((model) => (
          <Action key={model.id} title={shortModelName(model.name)} onAction={() => onRegenerate(model)} />
        ))}
      </ActionPanel.Submenu>
      {availableModels.length > 0 && (
        <ActionPanel.Submenu
          title="Regenerate Answer with Model…"
          // Distinct from `Icon.RotateClockwise` above AND from "Start New
          // Conversation"'s `Icon.RotateAntiClockwise` in `src/views/chat.tsx` — three
          // different rotate/restart-flavored icons in one panel would blur together.
          icon={Icon.Wand}
          shortcut={{ modifiers: ["cmd", "opt"], key: "r" }}
        >
          {availableModels.map((model) => {
            const selectionId = `${RAW_MODEL_PREFIX}${model.id}`;
            return (
              <Action
                key={selectionId}
                title={shortModelName(model.display_name)}
                onAction={() => onRegenerate(buildRawModel(selectionId, availableModels, rawModelDefaults))}
              />
            );
          })}
        </ActionPanel.Submenu>
      )}
    </ActionPanel.Section>
  );
};
