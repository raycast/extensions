import { Tool, getPreferenceValues } from "@raycast/api";
import { chatDefaults, fullModel } from "../lib/ai-models";
import { chatShape } from "../lib/chat";
import { generationResult } from "../lib/generation";
import { createPrediction, imageForModel, RAYCAST_AI_CANCEL_AFTER } from "../lib/replicate";

type Input = {
  /**
   * What the image should show. Pass the user's own wording; only expand it if they asked you to.
   */
  prompt: string;
  /**
   * The model to run, as `owner/name` or `owner/name:version`, e.g. `black-forest-labs/flux-schnell`.
   * Pass the model the user named, or the one chosen from list-models.
   */
  model?: string;
  /**
   * The URL of an image to change, such as an earlier generation's or one the user pasted. Only for models that
   * edit images. An image attached to the chat can't be passed here; only a URL can.
   */
  image?: string;
  /**
   * The shape of the image, e.g. `1:1`, `16:9`, `9:16` or `3:2`. Only pass this when the user asks
   * for a shape, and only for models that accept an `aspect_ratio` input.
   */
  aspectRatio?: string;
  /**
   * How many images to generate. Defaults to one; most models refuse more than four.
   */
  count?: number;
  /**
   * Any other inputs the model takes, as a JSON object keyed by the names describe-model lists,
   * e.g. `{"seed": 42, "output_format": "png"}`. Only include what the user asked for.
   */
  inputs?: string;
};

const parseInputs = (inputs: string | undefined, known?: Record<string, unknown>) => {
  if (!inputs?.trim()) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(inputs);
  } catch {
    throw new Error('inputs must be a JSON object, like {"seed": 42}.');
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error('inputs must be a JSON object, like {"seed": 42}.');
  }
  const unknown = known ? Object.keys(parsed).filter((name) => !(name in known)) : [];
  if (unknown.length) {
    throw new Error(`The model has no input named ${unknown.join(", ")}. Call describe-model for its inputs.`);
  }
  return parsed as Record<string, unknown>;
};

const FALLBACK_MODEL = "black-forest-labs/flux-schnell";

const resolveModel = (model?: string) => {
  const { defaultModel } = getPreferenceValues<Preferences>();
  const name = (model || defaultModel?.trim() || FALLBACK_MODEL).trim().replace(/^(https?:\/\/)?replicate\.com\//, "");
  if (!/^[^/\s]+\/[^/\s]+$/.test(name)) {
    throw new Error(`"${name}" is not a Replicate model. Models are written as owner/name.`);
  }
  return name;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const { confirmGenerations } = getPreferenceValues<Preferences>();
  if (!confirmGenerations) return undefined;

  return {
    message: "Running a model bills your Replicate account.",
    info: [
      { name: "Model", value: resolveModel(input.model) },
      { name: "Prompt", value: input.prompt },
      { name: "Image", value: input.image },
      { name: "Aspect ratio", value: input.aspectRatio },
      { name: "Images", value: input.count && input.count > 1 ? String(input.count) : undefined },
    ],
  };
};

// Long enough for a fast model to finish here, so most images need no check at all.
const START_WAIT_SECONDS = 5;

/**
 * Run an image model on Replicate. Waits up to five seconds, then returns the image if it's done, or an id
 * for check-generation.
 */
export default async function tool(input: Input) {
  const model = resolveModel(input.model);
  const [owner, name] = model.split("/");
  const [modelName, version] = name.split(":");

  // Models name their inputs differently, so the prompt and image go where this one expects them.
  const details = await fullModel(`${owner}/${modelName}`).catch(() => undefined);
  const shape = chatShape(details);
  const accepts = details?.latest_version?.openapi_schema?.components?.schemas?.Input?.properties;
  if (input.image && details && !shape?.image) {
    throw new Error(`${model} can't edit images. Pick a model from list-models that edits images.`);
  }
  if (!input.image && shape?.image?.required) {
    throw new Error(`${model} edits an existing image. Pass the image's URL as image.`);
  }
  const image = input.image && shape?.image ? await imageForModel(input.image) : undefined;

  const prediction = await createPrediction({
    owner,
    name: modelName,
    version,
    official: details?.is_official,
    wait: START_WAIT_SECONDS,
    cancelAfter: RAYCAST_AI_CANCEL_AFTER,
    input: {
      ...(await chatDefaults(`${owner}/${modelName}`)),
      ...parseInputs(input.inputs, accepts),
      [shape?.prompt ?? "prompt"]: input.prompt,
      ...(image && shape?.image ? { [shape.image.name]: shape.image.multiple ? [image] : image } : {}),
      ...(input.aspectRatio && (!accepts || accepts.aspect_ratio) ? { aspect_ratio: input.aspectRatio } : {}),
      ...(input.count && input.count > 1 && (!accepts || accepts.num_outputs) ? { num_outputs: input.count } : {}),
    },
  });

  return { model, ...(await generationResult(prediction)) };
}
