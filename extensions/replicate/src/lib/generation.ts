import { Prediction } from "../types";
import { altText } from "../utils/output";
import { isRunning, logPercent } from "../utils/status";
import { saveOutputs } from "./history";

export const generationResult = async (prediction: Prediction) => {
  if (isRunning(prediction)) {
    const percent = logPercent(prediction.logs);
    return {
      id: prediction.id,
      status: prediction.status,
      progress: percent ? `${percent}%` : undefined,
      instruction:
        "Still running. Call check-generation with this id now, before replying: a reply ends your turn and the image never arrives.",
    };
  }
  if (prediction.status !== "succeeded") {
    throw new Error(prediction.error ?? `The prediction ${prediction.status}.`);
  }

  const urls = (Array.isArray(prediction.output) ? prediction.output : [prediction.output]).filter(
    (output): output is string => typeof output === "string" && output.startsWith("http"),
  );
  if (!urls.length) {
    throw new Error(`${prediction.model ?? "The model"} did not return an image. It may not be an image model.`);
  }

  const alt = altText(prediction.input?.prompt ?? "");
  await saveOutputs(prediction);

  return {
    id: prediction.id,
    status: prediction.status,
    // The chat model has to retype this, so it stays a short link rather than an embedded image.
    markdown: urls.map((url) => `![${alt}](${url})`).join("\n\n"),
    instruction: "Reply with the markdown field exactly as given. It is the only way the user sees the image.",
    predictionUrl: `https://replicate.com/p/${prediction.id}`,
  };
};
