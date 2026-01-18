import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  Toast,
  getPreferenceValues,
  showToast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { HarvestClient } from "../api/harvest";
import {
  type HarvestErrorDisplay,
  getHarvestErrorDisplay,
} from "../api/harvestErrors";
import { getCachedJobs, setCachedJobs } from "../cache/cacheUtils";
import JobPipeline from "./JobPipeline";
import { fetchActiveJobPosts } from "./harvestData";
import type { JobListItem } from "./types";

function buildJobAccessories(job: JobListItem) {
  const accessories: { tag: { value: string; color: Color } }[] = [];
  if (job.hasExternal) {
    accessories.push({ tag: { value: "open", color: Color.Green } });
  }
  if (job.hasInternal) {
    accessories.push({ tag: { value: "internal", color: Color.Yellow } });
  }
  if (job.hasNoPosts) {
    accessories.push({
      tag: { value: "not posted", color: Color.SecondaryText },
    });
  }
  return accessories;
}

export default function JobsList() {
  const preferences = getPreferenceValues<{
    harvestApiKey: string;
    harvestBaseUrl?: string;
  }>();
  const client = useMemo(
    () =>
      new HarvestClient({
        apiKey: preferences.harvestApiKey,
        baseUrl: preferences.harvestBaseUrl,
      }),
    [preferences.harvestApiKey, preferences.harvestBaseUrl],
  );
  const [error, setError] = useState<HarvestErrorDisplay | null>(null);
  const cachedJobs = useMemo(() => getCachedJobs(), []);

  const { data, isLoading } = useCachedPromise(
    () => fetchActiveJobPosts(client),
    [],
    {
      initialData: cachedJobs ?? undefined,
      onData: (data) => {
        setCachedJobs(data);
        setError(null);
      },
      onError: async (err) => {
        const errorDisplay = getHarvestErrorDisplay(err, "jobs");
        setError(errorDisplay);
        if (errorDisplay.toastTitle) {
          await showToast({
            style: Toast.Style.Failure,
            title: errorDisplay.toastTitle,
            message: errorDisplay.toastMessage,
          });
        }
      },
    },
  );
  const jobs = (data ?? []).filter((job) => job.title);
  const showLoading = isLoading && data === undefined;

  return (
    <List isLoading={showLoading} searchBarPlaceholder="Search jobs">
      {!showLoading && jobs.length === 0 ? (
        <List.EmptyView
          title={error ? error.title : "No active job posts"}
          description={
            error ? error.description : "No active job posts found in Harvest."
          }
        />
      ) : (
        jobs.map((job) => (
          <List.Item
            key={job.job_id}
            icon={Icon.Folder}
            title={job.title}
            accessories={buildJobAccessories(job)}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Pipeline"
                  target={<JobPipeline job={job} />}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
