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
import {
  getCachedApplications,
  getCachedJobs,
  setCachedApplications,
  setCachedJobs,
} from "../cache/cacheUtils";
import JobPipeline from "./JobPipeline";
import { fetchActiveApplications, fetchActiveJobPosts } from "./harvestData";
import {
  buildCandidateApplicationUrl,
  buildCandidateName,
  buildCandidateProfileUrl,
} from "./pipelineUtils";
import type {
  HarvestApplication,
  HarvestCandidate,
  JobListItem,
} from "./types";

interface ApplicationListItem {
  application: HarvestApplication;
  candidate?: HarvestCandidate;
  candidateName: string;
  jobLabel: string | null;
  stageLabel?: string;
  searchText: string;
}

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

const buildSearchTokens = (value: string) => {
  return value
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
};

const matchesSearchTokens = (haystack: string, tokens: string[]) => {
  if (tokens.length === 0) {
    return true;
  }
  return tokens.every((token) => haystack.includes(token));
};

export default function JobsList() {
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
  const [jobError, setJobError] = useState<HarvestErrorDisplay | null>(null);
  const [applicationError, setApplicationError] =
    useState<HarvestErrorDisplay | null>(null);
  const [searchText, setSearchText] = useState("");
  const cachedJobs = useMemo(() => getCachedJobs(), []);
  const cachedApplications = useMemo(() => getCachedApplications(), []);

  const { data: jobsData, isLoading: jobsLoading } = useCachedPromise(
    () => fetchActiveJobPosts(client),
    [],
    {
      initialData: cachedJobs ?? undefined,
      onData: (data) => {
        setCachedJobs(data);
        setJobError(null);
      },
      onError: async (err) => {
        const errorDisplay = getHarvestErrorDisplay(err, "jobs");
        setJobError(errorDisplay);
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

  const { data: applicationsData, isLoading: applicationsLoading } =
    useCachedPromise(() => fetchActiveApplications(client), [], {
      initialData: cachedApplications ?? undefined,
      onData: (data) => {
        setCachedApplications(data);
        setApplicationError(null);
      },
      onError: async (err) => {
        const errorDisplay = getHarvestErrorDisplay(err, "applications");
        setApplicationError(errorDisplay);
        if (errorDisplay.toastTitle) {
          await showToast({
            style: Toast.Style.Failure,
            title: errorDisplay.toastTitle,
            message: errorDisplay.toastMessage,
          });
        }
      },
    });

  const jobs = (jobsData ?? []).filter((job) => job.title);
  const applications = applicationsData?.applications ?? [];
  const candidates = applicationsData?.candidates ?? {};
  const searchTokens = useMemo(
    () => buildSearchTokens(searchText),
    [searchText],
  );

  const showJobs = searchTokens.length === 0;
  const jobResults = useMemo(() => (showJobs ? jobs : []), [jobs, showJobs]);

  const applicationItems = useMemo<ApplicationListItem[]>(() => {
    return applications.map((application) => {
      const candidate = candidates[application.candidate_id];
      const candidateName =
        buildCandidateName(candidate) ??
        `Candidate ${application.candidate_id}`;
      const jobNames = (application.jobs ?? [])
        .map((job) => job.name)
        .filter(Boolean);
      const jobLabel = jobNames.length > 0 ? jobNames.join(", ") : null;
      const stageLabel = application.current_stage?.name ?? undefined;
      const searchParts = [
        candidateName,
        candidate?.name,
        candidate?.first_name,
        candidate?.last_name,
        candidate?.company,
        candidate?.title,
        jobLabel,
        ...jobNames,
        stageLabel,
        String(application.id),
        String(application.candidate_id),
      ].filter(Boolean);
      return {
        application,
        candidate,
        candidateName,
        jobLabel,
        stageLabel,
        searchText: searchParts.join(" ").toLowerCase(),
      };
    });
  }, [applications, candidates]);

  const showApplications = searchTokens.length > 0;
  const applicationResults = useMemo(() => {
    if (!showApplications) {
      return [];
    }
    return applicationItems.filter((item) =>
      matchesSearchTokens(item.searchText, searchTokens),
    );
  }, [applicationItems, searchTokens, showApplications]);

  const showLoading =
    (jobsLoading && jobsData === undefined) ||
    (applicationsLoading && applicationsData === undefined);
  const hasResults = jobResults.length > 0 || applicationResults.length > 0;
  const emptyError =
    searchTokens.length > 0 ? (applicationError ?? jobError) : jobError;
  const emptyTitle =
    searchTokens.length > 0
      ? (emptyError?.title ?? "No matches")
      : emptyError
        ? emptyError.title
        : "No active job posts";
  const emptyDescription =
    searchTokens.length > 0
      ? (emptyError?.description ??
        "Try another search or check application data.")
      : emptyError
        ? emptyError.description
        : "No active job posts found in Harvest.";

  return (
    <List
      isLoading={showLoading}
      searchBarPlaceholder="Search candidates"
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={false}
    >
      {!showLoading && !hasResults ? (
        <List.EmptyView title={emptyTitle} description={emptyDescription} />
      ) : (
        <>
          {jobResults.length > 0 && (
            <List.Section title="Jobs" subtitle={`${jobResults.length}`}>
              {jobResults.map((job) => (
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
              ))}
            </List.Section>
          )}
          {showApplications && applicationResults.length > 0 && (
            <List.Section
              title="Applications"
              subtitle={`${applicationResults.length}`}
            >
              {applicationResults.map((item) => {
                const applicationUrl = buildCandidateApplicationUrl(
                  preferences.recruitingBaseUrl,
                  item.application.candidate_id,
                  item.application.id,
                );
                const candidateUrl = buildCandidateProfileUrl(
                  preferences.recruitingBaseUrl,
                  item.application.candidate_id,
                );
                const accessories =
                  item.stageLabel === undefined
                    ? undefined
                    : [{ text: item.stageLabel }];

                return (
                  <List.Item
                    key={item.application.id}
                    icon={Icon.PersonCircle}
                    title={item.candidateName}
                    subtitle={item.jobLabel ?? undefined}
                    accessories={accessories}
                    actions={
                      <ActionPanel>
                        <Action.OpenInBrowser
                          title="Open Application"
                          icon={Icon.ArrowRight}
                          url={applicationUrl}
                        />
                        <Action.OpenInBrowser
                          title="Open Candidate Profile"
                          icon={Icon.Person}
                          url={candidateUrl}
                        />
                      </ActionPanel>
                    }
                  />
                );
              })}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
