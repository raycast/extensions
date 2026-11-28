import { fullModel } from "../lib/ai-models";
import { chatShape } from "../lib/chat";
import { modelFields } from "../utils/schema";

type Input = {
  /**
   * The model to describe, as `owner/name`, e.g. `black-forest-labs/flux-schnell`.
   */
  model: string;
};

/**
 * Get a Replicate model's inputs — names, types, allowed values, bounds and defaults — so
 * start-generation can set them through its `inputs` parameter.
 */
export default async function tool({ model }: Input) {
  const details = await fullModel(model.trim());
  const shape = chatShape(details);
  const automatic = [shape?.prompt, shape?.image?.name].filter(Boolean);

  return {
    id: model,
    description: details.description,
    makesImages: shape?.output === "image",
    editsImages: Boolean(shape?.image),
    needsImage: Boolean(shape?.image?.required),
    inputs: modelFields(details)
      .filter((field) => !automatic.includes(field.name))
      .map(({ name, schema, enums, required }) => ({
        name,
        type: enums.length ? "string" : schema.type,
        description: schema.description,
        options: enums.length ? enums : undefined,
        minimum: schema.minimum,
        maximum: schema.maximum,
        default: schema.default,
        required: required || undefined,
      })),
    instruction:
      "The prompt and image come from start-generation's own parameters. Put any other input in `inputs`, and only the ones the user asked for.",
  };
}
