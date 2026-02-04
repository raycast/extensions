import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  Toast,
  getPreferenceValues,
  open,
  showToast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useCallback, useMemo, useState } from "react";
import { HarvestClient } from "../api/harvest";
import {
  type HarvestErrorDisplay,
  getHarvestErrorDisplay,
} from "../api/harvestErrors";
import { getCachedPipeline, setCachedPipeline } from "../cache/cacheUtils";
import type { JobListItem } from "./types";
import {
  buildCandidateName,
  buildCandidateApplicationUrl,
  buildCandidateProfileUrl,
  buildPipelineSections,
  getDaysSince,
  getStageTintName,
  type StageTintName,
} from "./pipelineUtils";
import {
  fetchCandidateAttachments,
  fetchJobPipelineData,
  findResumeAttachment,
} from "./harvestData";

interface JobPipelineProps {
  job: JobListItem;
}

export default function JobPipeline({ job }: JobPipelineProps) {
  const preferences = getPreferenceValues<{
    harvestApiKey: string;
    harvestBaseUrl?: string;
    recruitingBaseUrl?: string;
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
  const cachedPipeline = useMemo(
    () => getCachedPipeline(job.job_id),
    [job.job_id],
  );
  const { data, isLoading } = useCachedPromise(
    (jobId) => fetchJobPipelineData(client, jobId),
    [job.job_id],
    {
      initialData: cachedPipeline ?? undefined,
      onData: (pipelineData) => {
        setCachedPipeline(job.job_id, pipelineData);
        setError(null);
      },
      onError: async (err) => {
        const errorDisplay = getHarvestErrorDisplay(err, "pipeline");
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

  const stages = data?.stages ?? [];
  const applications = data?.applications ?? [];
  const candidates = data?.candidates ?? {};
  const showLoading = isLoading && data === undefined;
  const stageTintColors: Record<StageTintName, Color> = {
    red: Color.Red,
    green: Color.Green,
    purple: Color.Purple,
    orange: Color.Orange,
    blue: Color.Blue,
    secondary: Color.SecondaryText,
  };

  const sections = useMemo(
    () => buildPipelineSections(applications, stages),
    [applications, stages],
  );

  const hasApplications = applications.length > 0;

  const handleDownloadResume = useCallback(
    async (candidateId: number) => {
      await showToast({
        style: Toast.Style.Animated,
        title: "Fetching resume...",
      });
      try {
        const attachments = await fetchCandidateAttachments(
          client,
          candidateId,
        );
        const resume = findResumeAttachment(attachments);
        if (resume) {
          await open(resume.url);
          await showToast({
            style: Toast.Style.Success,
            title: "Opening resume",
            message: resume.filename,
          });
        } else {
          await showToast({
            style: Toast.Style.Failure,
            title: "No resume found",
            message: "This candidate has no resume attachment",
          });
        }
      } catch (err) {
        const errorDisplay = getHarvestErrorDisplay(err, "pipeline");
        await showToast({
          style: Toast.Style.Failure,
          title: errorDisplay.toastTitle ?? "Failed to fetch resume",
          message: errorDisplay.toastMessage,
        });
      }
    },
    [client],
  );

  return (
    <List
      isLoading={showLoading}
      searchBarPlaceholder={`Search ${job.title} pipeline`}
    >
      {!showLoading && !hasApplications ? (
        <List.EmptyView
          title={error ? error.title : "No applications yet"}
          description={
            error
              ? error.description
              : "There are no applications for this job yet."
          }
        />
      ) : (
        sections.map((section) => (
          <List.Section
            key={section.id}
            title={section.title}
            subtitle={`${section.applications.length}`}
          >
            {section.applications.map((application) => {
              const candidate = candidates[application.candidate_id];
              const candidateName =
                buildCandidateName(candidate) ??
                `Candidate ${application.candidate_id}`;
              const daysSince = getDaysSince(
                application.last_activity_at ?? application.applied_at,
              );
              const activityLabel =
                daysSince === null ? undefined : `${daysSince}d`;
              const stageColor =
                stageTintColors[
                  getStageTintName(application.current_stage?.name)
                ];
              const candidateUrl = buildCandidateApplicationUrl(
                preferences.recruitingBaseUrl,
                application.candidate_id,
                application.id,
              );
              const candidateProfileUrl = buildCandidateProfileUrl(
                preferences.recruitingBaseUrl,
                application.candidate_id,
              );

              return (
                <List.Item
                  key={application.id}
                  icon={{ source: Icon.PersonCircle, tintColor: stageColor }}
                  title={candidateName}
                  accessories={
                    activityLabel ? [{ text: activityLabel }] : undefined
                  }
                  actions={
                    <ActionPanel>
                      <Action.OpenInBrowser
                        title="Open Application"
                        icon={Icon.ArrowRight}
                        url={candidateUrl}
                      />
                      <Action.OpenInBrowser
                        title="Open Candidate Profile"
                        icon={Icon.Person}
                        url={candidateProfileUrl}
                      />
                      <Action
                        title="Download Resume"
                        icon={Icon.Document}
                        shortcut={{ modifiers: ["cmd"], key: "d" }}
                        onAction={() =>
                          handleDownloadResume(application.candidate_id)
                        }
                      />
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        ))
      )}
    </List>
  );
}
