import { LaunchProps, showToast, Toast } from "@raycast/api";
import { getConfig } from "./lib/compatible-images/config";
import { modelKey } from "./lib/compatible-images/provider-settings";
import { createImage } from "./lib/compatible-images/images";
import { ImageJobContext, jobsDirectory } from "./lib/compatible-images/background";
import { claimJob, isActive, readJob, saveJob } from "./lib/compatible-images/jobs";

export default async function Command({ launchContext }: LaunchProps<{ launchContext: ImageJobContext }>) {
  if (!launchContext?.jobId) {
    await showToast({ title: "Start from Generate or Edit Image" });
    return;
  }
  const job = await readJob(jobsDirectory, launchContext.jobId);
  if (!isActive(job) || !(await claimJob(jobsDirectory, job.id))) return;
  try {
    const config = await getConfig();
    if (modelKey(config) !== launchContext.providerKey || config.model !== launchContext.model)
      throw new Error("Provider or model changed before the job started. Submit again with the intended settings.");
    await saveJob(jobsDirectory, { ...job, status: "running" });
    const result = await createImage(config, launchContext.input);
    await saveJob(jobsDirectory, { ...job, status: "succeeded", result });
  } catch (error) {
    await saveJob(jobsDirectory, {
      ...job,
      status: "failed",
      error: error instanceof Error ? error.message : "Could not create image",
    });
  }
  // Persist the outcome before any UI notification; reopening the form recovers it.
  const outcome = await readJob(jobsDirectory, job.id);
  await showToast({
    style: outcome.status === "succeeded" ? Toast.Style.Success : Toast.Style.Failure,
    title: outcome.status === "succeeded" ? "Image saved" : "Could not create image",
    message: "Open Generate or Edit Image to view the result",
  });
}
