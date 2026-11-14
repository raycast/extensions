import { AI, getPreferenceValues } from "@raycast/api";
import { chatDefaults, fullModel, pickerModelIds, recordUse, registeredModels } from "./lib/ai-models";
import { chatInput, chatReply, chatShape, sentImage, streamOutput } from "./lib/chat";
import { saveOutputs } from "./lib/history";
import {
  createPrediction,
  errorMessage,
  followPrediction,
  RAYCAST_AI_CANCEL_AFTER,
  RAYCAST_AI_RUN_MINUTES,
  stillRunning,
} from "./lib/replicate";
import { Prediction } from "./types";
import { isRunning, logPercent } from "./utils/status";

const STATUS = "status";
const ANSWER = "answer";
const CHAT_POLL_MS = 1000;

const status = (text: string): AI.ModelStreamPart => ({ type: "reasoning-delta", id: STATUS, text: `${text}\n` });
const answer = (text: string): AI.ModelStreamPart => ({ type: "text-delta", id: ANSWER, text });

const progress = (prediction: Prediction) => {
  if (prediction.status === "starting") return "Waiting for Replicate to start the model…";
  if (prediction.status !== "processing") return undefined;
  const percent = logPercent(prediction.logs);
  return percent ? `Generating… ${percent}%` : "Generating…";
};

const editingModels = async () => {
  const { kept, popular } = await pickerModelIds();
  const models = await Promise.all([...kept, ...popular].map((id) => fullModel(id).catch(() => undefined)));
  return models
    .filter((model) => model && chatShape(model)?.image)
    .map((model) => `${model?.owner}/${model?.name}`)
    .slice(0, 2);
};

const noImageReply = async (id: string) => {
  const suggestions = await editingModels();
  const pick = suggestions.length ? ` Pick one that does, like ${suggestions.join(" or ")}, and send it again.` : "";
  return `${id} can't use images, so nothing ran and nothing was billed.${pick}`;
};

export const getModels: AI.GetModels = () => registeredModels();

// Status goes out as reasoning so a slow run shows movement without ending up in the answer.
const run = async function* (
  registered: AI.RegisteredModel,
  request: AI.ModelRequest,
): AsyncGenerator<AI.ModelStreamPart> {
  yield { type: "reasoning-start", id: STATUS };
  yield status(`Starting ${registered.id} on Replicate…`);

  const model = await fullModel(registered.id);
  const shape = chatShape(model);
  if (!shape) throw new Error(`${registered.id} returns output that a chat can't show.`);
  await recordUse(registered.id);

  if (!shape.image && sentImage(request.messages ?? [], shape)) {
    yield { type: "reasoning-end", id: STATUS };
    yield { type: "text-start", id: ANSWER };
    yield answer(await noImageReply(registered.id));
    yield { type: "text-end", id: ANSWER };
    yield { type: "finish", finishReason: "stop" };
    return;
  }

  const { input, prompt } = await chatInput(model, shape, request);
  const created = await createPrediction({
    owner: model.owner,
    name: model.name,
    version: model.latest_version?.id,
    official: model.is_official,
    input: { ...(await chatDefaults(registered.id)), ...input },
    cancelAfter: RAYCAST_AI_CANCEL_AFTER,
  });

  if (shape.output === "text" && created.urls?.stream) {
    yield { type: "reasoning-end", id: STATUS };
    yield { type: "text-start", id: ANSWER };
    for await (const token of streamOutput(created.urls.stream, getPreferenceValues<Preferences>().token)) {
      yield answer(token);
    }
    yield { type: "text-end", id: ANSWER };
    yield { type: "finish", finishReason: "stop" };
    return;
  }

  let finished = created;
  let shown: string | undefined;
  // Giving up before Cancel-After fires bills for a result the chat never shows.
  const timeout = RAYCAST_AI_RUN_MINUTES * 60_000;
  for await (const prediction of followPrediction(created, { interval: CHAT_POLL_MS, timeout })) {
    finished = prediction;
    const line = progress(prediction);
    if (line && line !== shown) yield status(line);
    shown = line ?? shown;
  }
  if (isRunning(finished)) throw stillRunning(finished);
  if (finished.status !== "succeeded") throw new Error(finished.error ?? `The prediction ${finished.status}.`);

  const seconds = finished.metrics?.predict_time;
  yield status(seconds ? `Done in ${seconds.toFixed(1)}s.` : "Done.");
  yield { type: "reasoning-end", id: STATUS };
  yield { type: "text-start", id: ANSWER };
  yield answer(chatReply(finished, prompt, shape));
  yield { type: "text-end", id: ANSWER };
  await saveOutputs(finished);
  yield { type: "finish", finishReason: "stop" };
};

// Raycast shows a thrown error as the provider being down and retries, rerunning a billed model.
export const streamCompletion: AI.StreamCompletion = async function* (registered, request) {
  const open = new Set<string>();
  let answered = false;
  try {
    for await (const part of run(registered, request)) {
      if (part.type === "reasoning-start" || part.type === "text-start") open.add(part.id);
      if (part.type === "reasoning-end" || part.type === "text-end") open.delete(part.id);
      if (part.type === "text-end") answered = true;
      yield part;
    }
  } catch (error) {
    if (open.has(STATUS)) yield { type: "reasoning-end", id: STATUS };
    if (!answered) {
      const midAnswer = open.has(ANSWER);
      if (!midAnswer) yield { type: "text-start", id: ANSWER };
      yield answer(midAnswer ? `\n\n${errorMessage(error)}` : errorMessage(error));
      yield { type: "text-end", id: ANSWER };
    }
    yield { type: "finish", finishReason: "stop" };
  }
};
