import { fullModel, pickerModelIds } from "../lib/ai-models";
import { chatShape } from "../lib/chat";
import { modelId, searchModels } from "../lib/replicate";

type Input = {
  /**
   * What to look for, e.g. `logo`, `pixel art`, `remove background` or `upscale`.
   */
  query: string;
};

const RESULT_LIMIT = 12;

/**
 * Search all of Replicate for image models, beyond the ones in the user's Raycast AI model picker.
 */
export default async function tool({ query }: Input) {
  const [results, { kept, popular }] = await Promise.all([searchModels(query), pickerModelIds()]);
  const inPicker = new Set([...kept, ...popular]);

  // Search results leave out the schema, which is what says a model makes images.
  const models = await Promise.all(
    results.slice(0, RESULT_LIMIT).map(async (result) => {
      const id = modelId(result);
      const details = await fullModel(id).catch(() => undefined);
      const shape = chatShape(details);
      if (!details || shape?.output !== "image") return undefined;
      return {
        id,
        description: details.description,
        editsImages: Boolean(shape.image),
        needsImage: Boolean(shape.image?.required),
        official: Boolean(details.is_official),
        runs: details.run_count,
        inPicker: inPicker.has(id),
      };
    }),
  );

  return {
    models: models.filter((model) => model !== undefined),
    instruction:
      "Before running a model that isn't in the user's picker, tell them which one you'd use and why, and run it only after they agree.",
  };
}
