import { downloadResult, getClient } from "../lib/files";
import { addRecord, updateRecord } from "../lib/history";
import { generateImage } from "../lib/jobs";
import { ASPECT_RATIOS, sizeForAspectRatio, sortModels } from "../lib/models";

type Input = {
  /** A detailed description of the image to generate, in English. */
  prompt: string;
  /** The shape of the image. Defaults to square. */
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
};

/** Generates an image and returns its URL, the saved file path and the model used. */
export default async function tool(input: Input) {
  const client = getClient();
  const [model] = sortModels(await client.listModels("txt2img"), "txt2img");
  if (!model) throw new Error("No image models are available to this deAPI account.");

  const ratio = ASPECT_RATIOS.find((item) => item.id === input.aspectRatio)?.ratio ?? 1;
  const size = sizeForAspectRatio(model, ratio);
  const requestId = await generateImage(client, { model, prompt: input.prompt, ...size });
  await addRecord({
    requestId,
    kind: "image",
    model: model.name,
    input: input.prompt,
    createdAt: new Date().toISOString(),
    status: "pending",
    ...size,
  });

  const job = await client.waitForJob(requestId, { timeoutMs: 3 * 60 * 1000 });
  const url = job.result_url ?? undefined;
  const path = url ? await downloadResult(url, "image", requestId) : undefined;
  await updateRecord(requestId, { status: "done", resultUrl: url, filePath: path });
  return { url, path, model: model.name, width: size.width, height: size.height };
}
