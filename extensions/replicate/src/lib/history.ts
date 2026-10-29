import { environment, getPreferenceValues } from "@raycast/api";
import { mkdir, readdir } from "node:fs/promises";
import { extname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { Prediction } from "../types";
import { files, outputItems } from "../utils/output";
import { downloadFile } from "./replicate";

export type SavedOutputs = Record<string, string[]>;

const directory = () => join(environment.supportPath, "generations");

// Replicate deletes API outputs about an hour after they run, so a copy is the only history.
export const saveOutputs = async (prediction: Prediction) => {
  const { saveImages } = getPreferenceValues<Preferences>();
  const outputs = files(outputItems(prediction.output));
  if (!saveImages || prediction.status !== "succeeded" || !outputs.length) return;

  await mkdir(directory(), { recursive: true });
  const saved = (await savedOutputs())[prediction.id] ?? [];
  await Promise.all(
    outputs.map(({ url }, index) =>
      saved[index]
        ? undefined
        : downloadFile(url, join(directory(), `${prediction.id}-${index}${extname(new URL(url).pathname)}`)).catch(
            () => undefined,
          ),
    ),
  );
};

export const savedOutputs = async () => {
  const names = await readdir(directory()).catch((): string[] => []);
  const saved: SavedOutputs = {};
  for (const name of names) {
    const match = name.match(/^([a-z0-9]+)-(\d+)(\.[a-z0-9]+)?$/i);
    if (!match) continue;
    saved[match[1]] ??= [];
    saved[match[1]][Number(match[2])] = join(directory(), name);
  }
  return saved;
};

export const predictionItems = (prediction: Prediction, saved: SavedOutputs) => {
  const paths = saved[prediction.id] ?? [];
  if (!paths.some(Boolean)) return outputItems(prediction.output);
  const local = (path: string) => pathToFileURL(path).href;
  const remote = files(outputItems(prediction.output));
  // A copy that failed to download falls back to its remote file instead of disappearing.
  const urls = remote.length
    ? remote.map((item, index) => (paths[index] ? local(paths[index]) : item.url))
    : paths.filter(Boolean).map(local);
  return outputItems(urls);
};

export const isSaved = (url: string) => url.startsWith("file:");
