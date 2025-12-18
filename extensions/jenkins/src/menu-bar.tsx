import {
  MenuBarExtra,
  open,
  getPreferenceValues,
  openCommandPreferences,
  Icon,
  Color,
  showToast,
  Toast,
  LocalStorage,
} from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import { JenkinsAPI, Jenkins, Job } from "./lib/api";
import { listJenkins } from "./lib/storage";

const CACHE_KEY = "jenkins-menu-bar-cache";

interface Preferences {
  trackedJobs: string;
  refreshInterval: string;
  enableNotifications: boolean;
  notifyOnSuccess: boolean;
  notifyOnFailure: boolean;
}

interface JobStatus {
  name: string;
  url: string;
  color?: string;
  lastBuildNumber?: number;
  lastBuildUrl?: string;
  isBuilding?: boolean;
  buildCount?: number;
  lastBuildTimestamp?: number;
  lastSuccessfulBuild?: number;
  lastFailedBuild?: number;
  currentStage?: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [jobStatuses, setJobStatuses] = useState<JobStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [hasCache, setHasCache] = useState(false);
  const previousStatusesRef = useRef<Map<string, string>>(new Map());

  const refreshInterval = parseInt(preferences.refreshInterval || "30") * 1000;

  // Load cached data
  const loadCache = async () => {
    try {
      const cached = await LocalStorage.getItem(CACHE_KEY);
      if (cached) {
        const data = JSON.parse(cached.toString()) as JobStatus[];
        setJobStatuses(data);
        setHasCache(true);
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Failed to load cache:", err);
    }
  };

  // Save data to cache
  const saveCache = async (data: JobStatus[]) => {
    try {
      await LocalStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (err) {
      console.error("Failed to save cache:", err);
    }
  };

  const getStatusIcon = (color?: string) => {
    if (!color) return { source: Icon.CircleFilled, tintColor: Color.SecondaryText };

    if (color.includes("anime")) {
      return { source: Icon.CircleProgress, tintColor: Color.Blue };
    }

    if (color.startsWith("blue")) {
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    } else if (color.startsWith("red")) {
      return { source: Icon.XMarkCircle, tintColor: Color.Red };
    } else if (color.startsWith("yellow")) {
      return { source: Icon.ExclamationMark, tintColor: Color.Yellow };
    } else if (color.startsWith("grey") || color.startsWith("disabled") || color.startsWith("aborted")) {
      return { source: Icon.CircleFilled, tintColor: Color.SecondaryText };
    }

    return { source: Icon.CircleFilled, tintColor: Color.SecondaryText };
  };

  const getMenuBarIcon = () => {
    if (isLoading) {
      return Icon.CircleProgress;
    }

    if (error) {
      return Icon.XMarkCircle;
    }

    // Check if any job is building
    const isBuilding = jobStatuses.some((job) => job.color?.includes("anime"));
    if (isBuilding) {
      return Icon.CircleProgress;
    }

    // Check if any job failed
    const hasFailed = jobStatuses.some((job) => job.color?.startsWith("red"));
    if (hasFailed) {
      return Icon.XMarkCircle;
    }

    // Check if all jobs are successful
    const allSuccess = jobStatuses.every((job) => job.color?.startsWith("blue"));
    if (allSuccess && jobStatuses.length > 0) {
      return Icon.CheckCircle;
    }

    return Icon.Dot;
  };

  const searchJobsRecursively = async (
    jenkinsAPI: JenkinsAPI,
    trackedJobNames: string[],
    jobPath?: string[],
    depth: number = 0,
    visitedUrls: Set<string> = new Set(),
  ): Promise<JobStatus[]> => {
    const statuses: JobStatus[] = [];

    // Prevent infinite recursion with depth limit
    if (depth > 10) {
      console.warn(`Max recursion depth reached at path ${jobPath?.join("/")}`);
      return statuses;
    }

    try {
      const resp = await jenkinsAPI.inspect(jobPath);

      if (resp.jobs) {
        for (const job of resp.jobs) {
          // Skip if we've already visited this job URL
          if (visitedUrls.has(job.url)) {
            continue;
          }
          visitedUrls.add(job.url);

          // Check if this job matches any tracked name (exact match)
          const matches = trackedJobNames.some((name) => job.name.toLowerCase() === name.toLowerCase());

          if (
            matches &&
            job._class !== "com.cloudbees.hudson.plugins.folder.Folder" &&
            job._class !== "org.jenkinsci.plugins.workflow.multibranch.WorkflowMultiBranchProject"
          ) {
            // This is a trackable job (not a folder) - fetch detailed info
            try {
              const jobPathParts = job.url
                .replace(jenkinsAPI.jenkins.url, "")
                .split("/")
                .filter((p) => p && p !== "job");
              const detailedResp = await jenkinsAPI.inspect(jobPathParts);

              const lastBuild = detailedResp.builds?.[0];
              const buildCount = detailedResp.builds?.length || 0;

              let currentStage: string | undefined;
              // If the job is building, try to fetch the current pipeline stage
              if (job.color?.includes("anime") && lastBuild?.url) {
                try {
                  const stages = await jenkinsAPI.getPipelineStages(lastBuild.url);
                  // Find the currently running stage
                  const runningStage = stages.find((s) => s.status === "IN_PROGRESS");
                  if (runningStage) {
                    currentStage = runningStage.name;
                  }
                } catch (err) {
                  // Pipeline API might not be available, ignore
                }
              }

              statuses.push({
                name: job.name,
                url: job.url,
                color: job.color,
                isBuilding: job.color?.includes("anime"),
                lastBuildNumber: lastBuild?.number,
                lastBuildUrl: lastBuild?.url,
                buildCount: buildCount,
                currentStage: currentStage,
              });
            } catch (err) {
              // If detailed fetch fails, fall back to basic info
              statuses.push({
                name: job.name,
                url: job.url,
                color: job.color,
                isBuilding: job.color?.includes("anime"),
              });
            }
          }

          // If it's a folder or multibranch project, recurse into it
          if (
            job._class === "com.cloudbees.hudson.plugins.folder.Folder" ||
            job._class === "org.jenkinsci.plugins.workflow.multibranch.WorkflowMultiBranchProject"
          ) {
            const subPath = jobPath ? [...jobPath, job.path ?? ""] : [job.path ?? ""];
            const subStatuses = await searchJobsRecursively(
              jenkinsAPI,
              trackedJobNames,
              subPath,
              depth + 1,
              visitedUrls,
            );
            statuses.push(...subStatuses);
          }
        }
      }
    } catch (err) {
      console.error(`Failed to fetch jobs at path ${jobPath?.join("/")}:`, err);
    }

    return statuses;
  };

  const fetchJobStatuses = async (showLoadingState = false) => {
    try {
      // Only show loading if explicitly requested or no cache
      if (showLoadingState || !hasCache) {
        setIsLoading(true);
      }

      const trackedJobsConfig = preferences.trackedJobs || "";
      if (!trackedJobsConfig.trim()) {
        setError("No tracked jobs configured");
        setIsLoading(false);
        return;
      }

      const jenkinsList = await listJenkins();
      if (jenkinsList.length === 0) {
        setError("No Jenkins instances configured");
        setIsLoading(false);
        return;
      }

      // Parse tracked jobs (format: "job1,job2,job3")
      const trackedJobNames = trackedJobsConfig
        .split(",")
        .map((j) => j.trim())
        .filter((j) => j);

      const statuses: JobStatus[] = [];

      for (const jenkins of jenkinsList) {
        try {
          const jenkinsAPI = new JenkinsAPI(jenkins);
          const jobStatuses = await searchJobsRecursively(jenkinsAPI, trackedJobNames);
          statuses.push(...jobStatuses);
        } catch (err) {
          console.error(`Failed to fetch jobs from ${jenkins.name}:`, err);
        }
      }

      setJobStatuses(statuses);
      await saveCache(statuses);
      setError(undefined);

      // Send notifications for status changes
      if (preferences.enableNotifications) {
        for (const status of statuses) {
          const previousStatus = previousStatusesRef.current.get(status.url);
          const currentStatus = status.color?.replace("_anime", ""); // Remove anime suffix for comparison

          // Only notify if status changed and build is complete (not building)
          if (previousStatus && previousStatus !== currentStatus && !status.isBuilding) {
            const isSuccess = currentStatus?.startsWith("blue");
            const isFailure = currentStatus?.startsWith("red");

            if ((isSuccess && preferences.notifyOnSuccess) || (isFailure && preferences.notifyOnFailure)) {
              const title = isSuccess ? "Build Succeeded" : "Build Failed";
              const message = `${status.name}${status.lastBuildNumber ? ` #${status.lastBuildNumber}` : ""}`;
              const style = isSuccess ? Toast.Style.Success : Toast.Style.Failure;

              await showToast({ style, title, message });
            }
          }

          // Update previous status
          if (currentStatus) {
            previousStatusesRef.current.set(status.url, currentStatus);
          }
        }
      }
    } catch (err) {
      setError(String(err));
      showToast({ style: Toast.Style.Failure, title: "Failed to Fetch Job Status", message: String(err) });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Load cache first, then fetch fresh data
    const init = async () => {
      await loadCache();
      await fetchJobStatuses();
    };

    init();

    // Set up periodic refresh (without loading state)
    const interval = setInterval(() => {
      fetchJobStatuses(false);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [preferences.trackedJobs, refreshInterval]);

  const getTitle = () => {
    // Show "Loading..." only when there's no cache and we're loading
    if (isLoading && !hasCache && jobStatuses.length === 0) return "Loading...";
    if (error && jobStatuses.length === 0) return "Error";
    if (jobStatuses.length === 0) return "No Jobs";

    const successCount = jobStatuses.filter((j) => j.color?.startsWith("blue")).length;
    const totalCount = jobStatuses.length;

    return `${successCount}/${totalCount}`;
  };

  const title = getTitle();

  return (
    <MenuBarExtra icon={getMenuBarIcon()} title={title} isLoading={isLoading}>
      {error ? (
        <>
          <MenuBarExtra.Item title={`Error: ${error}`} />
          <MenuBarExtra.Item title="Open Preferences" icon={Icon.Gear} onAction={openCommandPreferences} />
        </>
      ) : (
        <>
          {jobStatuses.length === 0 ? (
            <>
              <MenuBarExtra.Item title="No tracked jobs found" />
              <MenuBarExtra.Item title="Configure Tracked Jobs" icon={Icon.Gear} onAction={openCommandPreferences} />
            </>
          ) : (
            <>
              {(() => {
                // Group jobs by status
                const buildingJobs = jobStatuses.filter((j) => j.isBuilding);
                const successJobs = jobStatuses.filter((j) => !j.isBuilding && j.color?.startsWith("blue"));
                const failedJobs = jobStatuses.filter((j) => !j.isBuilding && j.color?.startsWith("red"));
                const otherJobs = jobStatuses.filter(
                  (j) => !j.isBuilding && !j.color?.startsWith("blue") && !j.color?.startsWith("red"),
                );

                // Helper to shorten job names intelligently
                const shortenJobName = (name: string) => {
                  // If name is short enough, return as is
                  if (name.length <= 30) return name;

                  // Try to get the last meaningful part (after last slash or hyphen)
                  const parts = name.split(/[/-]/);
                  const lastPart = parts[parts.length - 1];

                  // If last part is meaningful, use it with ellipsis
                  if (lastPart && lastPart.length > 3) {
                    return `…${lastPart}`;
                  }

                  // Otherwise just truncate
                  return name.substring(0, 27) + "...";
                };

                const renderJob = (job: JobStatus) => {
                  const shortName = shortenJobName(job.name);
                  let subtitle = "";

                  if (job.isBuilding) {
                    if (job.currentStage) {
                      subtitle = job.lastBuildNumber
                        ? `Building #${job.lastBuildNumber} • ${job.currentStage}`
                        : `Building • ${job.currentStage}`;
                    } else {
                      subtitle = job.lastBuildNumber ? `Building #${job.lastBuildNumber}` : "Building...";
                    }
                  } else if (job.lastBuildNumber) {
                    subtitle = `#${job.lastBuildNumber} • ${job.buildCount || 0} builds`;
                  } else {
                    subtitle = "No builds";
                  }

                  return (
                    <MenuBarExtra.Item
                      key={job.url}
                      title={shortName}
                      icon={getStatusIcon(job.color)}
                      subtitle={subtitle}
                      tooltip={job.name} // Show full name on hover
                      onAction={() => open(job.url)}
                    />
                  );
                };

                return (
                  <>
                    {buildingJobs.length > 0 && (
                      <MenuBarExtra.Section title={`Building (${buildingJobs.length})`}>
                        {buildingJobs.map(renderJob)}
                      </MenuBarExtra.Section>
                    )}
                    {failedJobs.length > 0 && (
                      <MenuBarExtra.Section title={`Failed (${failedJobs.length})`}>
                        {failedJobs.map(renderJob)}
                      </MenuBarExtra.Section>
                    )}
                    {successJobs.length > 0 && (
                      <MenuBarExtra.Section title={`Success (${successJobs.length})`}>
                        {successJobs.map(renderJob)}
                      </MenuBarExtra.Section>
                    )}
                    {otherJobs.length > 0 && (
                      <MenuBarExtra.Section title={`Other (${otherJobs.length})`}>
                        {otherJobs.map(renderJob)}
                      </MenuBarExtra.Section>
                    )}
                    <MenuBarExtra.Section>
                      <MenuBarExtra.Item
                        title="Refresh"
                        icon={Icon.ArrowClockwise}
                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                        onAction={() => fetchJobStatuses(true)}
                      />
                      <MenuBarExtra.Item title="Configure" icon={Icon.Gear} onAction={openCommandPreferences} />
                    </MenuBarExtra.Section>
                  </>
                );
              })()}
            </>
          )}
        </>
      )}
    </MenuBarExtra>
  );
}
