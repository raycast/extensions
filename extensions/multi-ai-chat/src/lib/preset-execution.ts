import { loadPreset } from "./preset-storage.js";
import { AI_SERVICES, buildPromptUrlRequests } from "./prompt-urls.js";
import { renderPromptTemplate, type PromptPreset } from "./presets.js";

type PresetLoader = (id: string) => Promise<PromptPreset | undefined>;

export type PreparedPresetExecution =
  | { status: "missing" }
  | { status: "changed"; preset: PromptPreset }
  | {
      status: "ready";
      requests: ReturnType<typeof buildPromptUrlRequests>;
    };

export async function preparePresetExecution(
  preset: PromptPreset,
  values: Record<string, string>,
  loadPresetById: PresetLoader = loadPreset,
): Promise<PreparedPresetExecution> {
  const storedPreset = await loadPresetById(preset.id);
  if (!storedPreset) return { status: "missing" };
  if (!isSamePresetRevision(preset, storedPreset)) {
    return { status: "changed", preset: storedPreset };
  }

  const prompt = renderPromptTemplate(preset.template, values);
  return {
    status: "ready",
    requests: buildPromptUrlRequests(prompt, preset.serviceCounts),
  };
}

function isSamePresetRevision(
  displayedPreset: PromptPreset,
  storedPreset: PromptPreset,
): boolean {
  return (
    displayedPreset.id === storedPreset.id &&
    displayedPreset.name === storedPreset.name &&
    displayedPreset.template === storedPreset.template &&
    AI_SERVICES.every(
      ({ id }) =>
        displayedPreset.serviceCounts[id] === storedPreset.serviceCounts[id],
    )
  );
}
