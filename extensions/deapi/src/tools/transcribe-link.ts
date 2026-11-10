import { getClient } from "../lib/files";
import { addRecord, updateRecord } from "../lib/history";
import { transcribe, transcriptionText } from "../lib/jobs";
import { isSupportedLink, sortModels } from "../lib/models";

type Input = {
  /** The full URL of a public YouTube, X (Twitter), TikTok, Twitch or Kick video. */
  url: string;
};

/** Transcribes the speech in a video link and returns the text. */
export default async function tool(input: Input) {
  const url = input.url.trim();
  if (!isSupportedLink(url)) {
    throw new Error("Only YouTube, X (Twitter), TikTok, Twitch and Kick links are supported.");
  }
  const client = getClient();
  const [model] = sortModels(await client.listModels("video2text"), "transcription");
  if (!model) throw new Error("No transcription models are available to this deAPI account.");

  const requestId = await transcribe(client, { model: model.slug, link: url });
  await addRecord({
    requestId,
    kind: "transcription",
    model: model.name,
    input: url,
    createdAt: new Date().toISOString(),
    status: "pending",
  });

  const job = await client.waitForJob(requestId, { timeoutMs: 8 * 60 * 1000 });
  const text = await transcriptionText(job);
  await updateRecord(requestId, { status: "done", text, resultUrl: job.result_url ?? undefined });
  return text;
}
