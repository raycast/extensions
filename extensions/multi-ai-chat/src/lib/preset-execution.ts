import { loadPreset } from "./preset-storage.js";
import { buildPromptUrlRequests } from "./prompt-urls.js";
import { renderPromptTemplate, type PromptPreset } from "./presets.js";

type PresetLoader = (id: string) => Promise<PromptPreset | undefined>;

export type PreparedPresetExecution =
  | { status: "missing" }
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

  // The submitted preset is the UI snapshot; storage is checked only for deletion.
  const prompt = renderPromptTemplate(preset.template, values);
  return {
    status: "ready",
    requests: buildPromptUrlRequests(prompt, preset.serviceCounts),
  };
}
