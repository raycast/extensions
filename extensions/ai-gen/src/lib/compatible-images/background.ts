import { environment, LocalStorage } from "@raycast/api";
import { join } from "node:path";
import type { ImageInput } from "./images";
import { readJob } from "./jobs";

export const jobsDirectory = join(environment.supportPath, "image-jobs");
export const latestJobKey = "compatible-images-latest-job";
export type ImageJobContext = { jobId: string; input: ImageInput; providerKey: string; model: string };
export async function latestJob() {
  const id = await LocalStorage.getItem<string>(latestJobKey);
  return id ? readJob(jobsDirectory, id) : undefined;
}
