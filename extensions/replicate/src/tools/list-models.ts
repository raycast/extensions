import { getPreferenceValues } from "@raycast/api";
import { fullModel, pickerModelIds } from "../lib/ai-models";
import { chatShape } from "../lib/chat";

/**
 * List the image models in the user's Raycast AI model picker, with what each one is good at.
 */
export default async function tool() {
  const { defaultModel } = getPreferenceValues<Preferences>();
  const { kept, popular } = await pickerModelIds();
  const models = await Promise.all(
    [...kept, ...popular].map(async (id) => {
      const model = await fullModel(id).catch(() => undefined);
      const shape = chatShape(model);
      if (!model || shape?.output !== "image") return undefined;
      return {
        id,
        description: model.description,
        editsImages: Boolean(shape.image),
        needsImage: Boolean(shape.image?.required),
        official: Boolean(model.is_official),
        runs: model.run_count,
      };
    }),
  );
  const images = models.filter((model) => model !== undefined);
  const chosen = defaultModel?.trim();

  return {
    default: chosen || null,
    models: images,
    instruction: chosen
      ? `Use ${chosen} unless the user names another model or wants an existing image changed and it can't edit images.`
      : "Pick the model whose description best fits the request. To change an existing image, pick one that edits images.",
  };
}
