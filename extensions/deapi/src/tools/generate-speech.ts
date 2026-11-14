import { Tool } from "@raycast/api";
import { downloadResult, getClient } from "../lib/files";
import { addRecord, updateRecord } from "../lib/history";
import { generateSpeech } from "../lib/jobs";
import { speechModels, voicesFor } from "../lib/models";

type Input = {
  /** The text to read aloud. Up to 10,000 characters. */
  text: string;
  /**
   * Optional Kokoro voice. American English: af_heart, af_bella, af_nova, am_adam, am_michael, am_onyx.
   * British English: bf_emma, bm_george. Spanish: ef_dora, em_alex. French: ff_siwis. Hindi: hf_alpha, hm_omega.
   * Italian: if_sara, im_nicola. Brazilian Portuguese: pf_dora, pm_alex. Pick one that matches the text's language.
   */
  voice?: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: "Generate speech with deAPI and save it as an MP3? This request uses deAPI credits.",
  info: [
    { name: "Text", value: input.text.length > 200 ? `${input.text.slice(0, 199)}…` : input.text },
    { name: "Length", value: `${input.text.length.toLocaleString()} characters` },
    ...(input.voice ? [{ name: "Voice", value: input.voice }] : []),
  ],
});

/** Reads text aloud and saves an MP3. Returns the file path. */
export default async function tool(input: Input) {
  const client = getClient();
  const models = speechModels(await client.listModels("txt2audio"));
  const model = models.find((item) => item.slug === "Kokoro") ?? models[0];
  if (!model) throw new Error("No text-to-speech models are available to this deAPI account.");

  const voice = voicesFor(model).find((item) => item.id === input.voice)?.id;
  const requestId = await generateSpeech(client, { model, text: input.text, voice });
  await addRecord({
    requestId,
    kind: "speech",
    model: model.name,
    input: input.text,
    createdAt: new Date().toISOString(),
    status: "pending",
  });

  const job = await client.waitForJob(requestId, { timeoutMs: 5 * 60 * 1000 });
  const path = job.result_url ? await downloadResult(job.result_url, "speech", requestId) : undefined;
  await updateRecord(requestId, { status: "done", resultUrl: job.result_url ?? undefined, filePath: path });
  return { path, model: model.name, voice: voice ?? model.info?.defaults?.voice };
}
