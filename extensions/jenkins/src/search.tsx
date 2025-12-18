import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  Icon,
  Alert,
  confirmAlert,
  Color,
  LocalStorage,
} from "@raycast/api";
import { useState, useEffect, useCallback, useRef } from "react";
import { JenkinsAPI, Jenkins, Job, hasSubJobs, Suggestion, PipelineStage } from "./lib/api";
import type { Build as BuildType } from "./lib/api";
import { addFavorite, removeFavorite, isFavorite } from "./lib/storage";

interface JobWithDetails extends Job {
  lastBuildNumber?: number;
  lastBuildResult?: string;
  lastBuildDuration?: number;
  isBuilding?: boolean;
}

interface SearchProps {
  jenkins: Jenkins;
  jobs?: string[];
  navigationTitle: string;
  suggestions?: string[];
  isGlobalSearch?: boolean;
}

export function Search(props: SearchProps) {
  const [jobs, setJobs] = useState<JobWithDetails[]>([]);
  const [allJobs, setAllJobs] = useState<JobWithDetails[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchText, setSearchText] = useState<string>("");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [prefixFilter, setPrefixFilter] = useState<string>("all");
  const abortControllerRef = useRef<AbortController | null>(null);

  // Helper to extract common prefixes from job names
  const extractPrefixes = useCallback((jobList: JobWithDetails[]): string[] => {
    const prefixes = new Set<string>();
    jobList.forEach((job) => {
      const match = job.name.match(/^([a-zA-Z]+[-_])/);
      if (match) {
        prefixes.add(match[1].replace(/[-_]$/, ""));
      }
    });
    return Array.from(prefixes).sort();
  }, []);

  // Helper to get status icon and color based on job color
  const getStatusIcon = (color?: string) => {
    if (!color) return { source: Icon.Circle, tintColor: Color.SecondaryText };

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
      return { source: Icon.Circle, tintColor: Color.SecondaryText };
    }

    return { source: Icon.Circle, tintColor: Color.SecondaryText };
  };

  // Helper to format duration
  const formatDuration = (ms?: number): string => {
    if (!ms) return "";
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  const loadFavorites = useCallback(async () => {
    const favs = new Set<string>();
    for (const job of jobs) {
      if (await isFavorite(props.jenkins.id, job.url)) {
        favs.add(job.url);
      }
    }
    setFavorites(favs);
  }, [jobs, props.jenkins.id]);

  const search = useCallback(
    async function search(text: string) {
      if (searchText !== text) {
        setSearchText(text);
      }

      // Cancel any ongoing background fetch
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      setIsLoading(true);
      try {
        const jenkinsAPI = new JenkinsAPI(props.jenkins);
        if (props.isGlobalSearch) {
          if (text !== "") {
            setSuggestions(await jenkinsAPI.search(text));
          }
          setIsLoading(false);
        } else {
          const resp = await jenkinsAPI.inspect(props.jobs);
          const jobsWithDetails: JobWithDetails[] = [];

          // Add all jobs with basic info
          for (const job of resp.jobs || []) {
            const jobWithDetails: JobWithDetails = {
              ...job,
              isBuilding: job.color?.includes("anime"),
            };
            jobsWithDetails.push(jobWithDetails);
          }

          // Apply text search and prefix filter
          let filtered = jobsWithDetails.filter((job) => job.name.toLowerCase().includes(text.toLowerCase()));

          if (prefixFilter !== "all") {
            filtered = filtered.filter((job) => job.name.toLowerCase().startsWith(prefixFilter.toLowerCase() + "-"));
          }

          // Set initial state with all jobs
          setAllJobs(jobsWithDetails);
          setJobs(filtered);
          setIsLoading(false);

          // Second pass: fetch build details in background for non-folder jobs
          // Limit to first 20 jobs to avoid overwhelming the server
          const jobsToFetch = filtered.filter((job) => !hasSubJobs(job)).slice(0, 20);

          if (jobsToFetch.length > 0) {
            // Fetch all build details in parallel with a concurrency limit
            const fetchBuildDetails = async (job: JobWithDetails) => {
              if (signal.aborted) return job;

              try {
                const jobPath = job.url
                  .replace(jenkinsAPI.jenkins.url, "")
                  .split("/")
                  .filter((p) => p && p !== "job");
                const detailedResp = await jenkinsAPI.inspect(jobPath);

                const lastBuild = detailedResp.builds?.[0];
                if (lastBuild) {
                  return {
                    ...job,
                    lastBuildNumber: lastBuild.number,
                    lastBuildDuration: lastBuild.duration,
                    isBuilding: lastBuild.building ?? job.isBuilding,
                  };
                }
              } catch (err) {
                // Ignore errors fetching individual job details
              }
              return job;
            };

            // Fetch all in parallel with concurrency limit and collect results
            const concurrencyLimit = 5;
            const allResults: JobWithDetails[] = [];

            for (let i = 0; i < jobsToFetch.length; i += concurrencyLimit) {
              if (signal.aborted) break;

              const batch = jobsToFetch.slice(i, i + concurrencyLimit);
              const results = await Promise.all(batch.map(fetchBuildDetails));
              allResults.push(...results);
            }

            // Apply all updates at once instead of in a loop
            if (!signal.aborted && allResults.length > 0) {
              setAllJobs((prevJobs) => {
                const updated = [...prevJobs];
                allResults.forEach((result) => {
                  const index = updated.findIndex((j) => j.url === result.url);
                  if (index !== -1) {
                    updated[index] = result;
                  }
                });
                return updated;
              });

              setJobs((prevJobs) => {
                const updated = [...prevJobs];
                allResults.forEach((result) => {
                  const index = updated.findIndex((j) => j.url === result.url);
                  if (index !== -1) {
                    updated[index] = result;
                  }
                });
                return updated;
              });
            }
          }
        }
      } catch (err) {
        showToast({ style: Toast.Style.Failure, title: "Search Failed", message: String(err) });
        setIsLoading(false);
      }
    },
    [props.jenkins, props.isGlobalSearch, props.jobs, searchText, prefixFilter],
  );

  useEffect(() => {
    const init = async () => {
      const cacheKey = `jenkins-filter-${props.jenkins.id}`;
      const saved = await LocalStorage.getItem(cacheKey);
      if (saved && typeof saved === "string") {
        setPrefixFilter(saved);
      }
    };

    init();
    search("");

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    if (!props.isGlobalSearch) {
      loadFavorites();
    }
  }, [jobs, loadFavorites, props.isGlobalSearch]);

  useEffect(() => {
    if (prefixFilter) {
      const saveFilter = async () => {
        const cacheKey = `jenkins-filter-${props.jenkins.id}`;
        await LocalStorage.setItem(cacheKey, prefixFilter);
      };
      saveFilter();
    }
  }, [prefixFilter, props.jenkins.id]);

  useEffect(() => {
    if (!props.isGlobalSearch && allJobs.length > 0) {
      let filtered = allJobs.filter((job) => job.name.toLowerCase().includes(searchText.toLowerCase()));

      if (prefixFilter !== "all") {
        filtered = filtered.filter((job) => job.name.toLowerCase().startsWith(prefixFilter.toLowerCase() + "-"));
      }

      setJobs(filtered);
    }
  }, [prefixFilter, allJobs, searchText, props.isGlobalSearch]);

  if (props.isGlobalSearch) {
    return (
      <List
        navigationTitle={props.navigationTitle}
        isLoading={isLoading}
        onSearchTextChange={search}
        searchBarPlaceholder="Search..."
        throttle
      >
        <List.Section title="Results" subtitle={suggestions.length + ""}>
          {suggestions.map((suggestion) => (
            <List.Item
              key={suggestion.url}
              title={suggestion.name}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.OpenInBrowser title="Open in Browser" url={suggestion.url} />
                    <Action.SubmitForm
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      onSubmit={async () => {
                        await search(searchText);
                      }}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                    />
                    <Action.CopyToClipboard
                      icon={Icon.CopyClipboard}
                      title="Copy URL"
                      content={suggestion.url}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      </List>
    );
  }

  const prefixes = extractPrefixes(allJobs);

  return (
    <List
      navigationTitle={props.navigationTitle}
      isLoading={isLoading}
      onSearchTextChange={search}
      searchBarPlaceholder="Search Jobs..."
      throttle
      searchBarAccessory={
        prefixes.length > 0 ? (
          <List.Dropdown tooltip="Filter by Prefix" value={prefixFilter} onChange={setPrefixFilter}>
            <List.Dropdown.Item title="All Jobs" value="all" />
            <List.Dropdown.Section>
              {prefixes.map((prefix) => (
                <List.Dropdown.Item key={prefix} title={prefix} value={prefix} />
              ))}
            </List.Dropdown.Section>
          </List.Dropdown>
        ) : undefined
      }
    >
      {(() => {
        const favoriteJobs = jobs.filter((j) => favorites.has(j.url));
        const otherJobs = jobs.filter((j) => !favorites.has(j.url));

        const renderJob = (job: JobWithDetails) => {
          const isFav = favorites.has(job.url);
          const statusIcon = getStatusIcon(job.color);

          // Build accessories with status, type, and favorite
          const accessories: List.Item.Accessory[] = [];

          // Build number and duration
          if (job.lastBuildNumber) {
            const duration = formatDuration(job.lastBuildDuration);
            accessories.push({ text: `#${job.lastBuildNumber}${duration ? ` • ${duration}` : ""}` });
          }

          // Job type tag
          if (hasSubJobs(job)) {
            accessories.push({ tag: { value: "Folder", color: Color.Blue }, tooltip: job._class });
          } else if (job.shortClass) {
            const typeMap: Record<string, string> = {
              WorkflowJob: "Pipeline",
              FreeStyleProject: "Freestyle",
              WorkflowMultiBranchProject: "Multibranch",
            };
            const typeLabel = typeMap[job.shortClass] || job.shortClass;
            accessories.push({ tag: { value: typeLabel, color: Color.SecondaryText }, tooltip: job._class });
          }

          return (
            <List.Item
              key={job.url}
              title={job.name}
              icon={statusIcon}
              accessories={accessories}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    {hasSubJobs(job) ? (
                      <Action.Push
                        icon={Icon.List}
                        title="View Jobs"
                        target={
                          <Search
                            jenkins={props.jenkins}
                            jobs={
                              props.jobs && job.path
                                ? [...props.jobs, job.path]
                                : job.path
                                  ? [job.path]
                                  : job.name
                                    ? [job.name]
                                    : []
                            }
                            navigationTitle={job.name}
                          />
                        }
                      />
                    ) : (
                      <Action.Push
                        icon={Icon.Box}
                        title="Builds"
                        target={
                          <Build
                            jenkins={props.jenkins}
                            jobs={
                              props.jobs && job.path
                                ? [...props.jobs, job.path]
                                : job.path
                                  ? [job.path]
                                  : job.name
                                    ? [job.name]
                                    : []
                            }
                          />
                        }
                      />
                    )}
                    {job.lastBuildNumber && (
                      <Action.Push
                        icon={Icon.Text}
                        title="View Last Build Console"
                        target={
                          <ConsoleLog
                            jenkins={props.jenkins}
                            buildUrl={`${job.url}${job.lastBuildNumber}/`}
                            buildNumber={job.lastBuildNumber}
                          />
                        }
                        shortcut={{ modifiers: ["cmd"], key: "l" }}
                      />
                    )}
                    <Action.OpenInBrowser title="Open in Browser" url={job.url} />
                    {!hasSubJobs(job) &&
                      (job.isBuilding && job.lastBuildNumber ? (
                        <Action.SubmitForm
                          icon={Icon.Stop}
                          title="Stop Build"
                          shortcut={{ modifiers: ["cmd"], key: "x" }}
                          onSubmit={async () => {
                            const options: Alert.Options = {
                              title: "Stop the Build",
                              message: `Stop build #${job.lastBuildNumber}?`,
                              primaryAction: {
                                title: "Stop Build",
                                style: Alert.ActionStyle.Destructive,
                                onAction: async () => {
                                  try {
                                    const jenkinsAPI = new JenkinsAPI(props.jenkins);
                                    const jobPath = job.url
                                      .replace(jenkinsAPI.jenkins.url, "")
                                      .split("/")
                                      .filter((p) => p && p !== "job");
                                    const detailedResp = await jenkinsAPI.inspect(jobPath);
                                    const lastBuild = detailedResp.builds?.[0];
                                    if (lastBuild?.url) {
                                      await jenkinsAPI.stopBuild(lastBuild.url);
                                      showToast(Toast.Style.Success, "Build Stopped");
                                      await search(searchText);
                                    }
                                  } catch (err) {
                                    showToast(Toast.Style.Failure, "Stop Build Failed", String(err));
                                  }
                                },
                              },
                            };
                            await confirmAlert(options);
                          }}
                        />
                      ) : (
                        <Action.SubmitForm
                          icon={Icon.Forward}
                          title="Build Job"
                          shortcut={{ modifiers: ["cmd"], key: "b" }}
                          onSubmit={async () => {
                            const options: Alert.Options = {
                              title: "Build the Job",
                              message: "Build the job without parameters",
                              primaryAction: {
                                title: "Build Job",
                                onAction: async () => {
                                  try {
                                    const jenkinsAPI = new JenkinsAPI(props.jenkins);
                                    await jenkinsAPI.build(job);
                                    showToast(Toast.Style.Success, "Job Build Created");
                                  } catch (err) {
                                    showToast(Toast.Style.Failure, "Build Job Failed", String(err));
                                  }
                                },
                              },
                            };
                            await confirmAlert(options);
                          }}
                        />
                      ))}
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    {isFav ? (
                      <Action
                        icon={Icon.StarDisabled}
                        title="Remove from Favorites"
                        onAction={async () => {
                          try {
                            await removeFavorite(props.jenkins.id, job.url);
                            setFavorites((prev) => {
                              const next = new Set(prev);
                              next.delete(job.url);
                              return next;
                            });
                            showToast(Toast.Style.Success, "Removed from Favorites");
                          } catch (err) {
                            showToast(Toast.Style.Failure, "Failed to Remove Favorite", String(err));
                          }
                        }}
                        shortcut={{ modifiers: ["cmd"], key: "f" }}
                      />
                    ) : (
                      <Action
                        icon={Icon.Star}
                        title="Add to Favorites"
                        onAction={async () => {
                          try {
                            await addFavorite({
                              jenkinsId: props.jenkins.id,
                              jobUrl: job.url,
                              jobName: job.name,
                              jobPath: job.path ?? "",
                            });
                            setFavorites((prev) => new Set(prev).add(job.url));
                            showToast(Toast.Style.Success, "Added to Favorites");
                          } catch (err) {
                            showToast(Toast.Style.Failure, "Failed to Add Favorite", String(err));
                          }
                        }}
                        shortcut={{ modifiers: ["cmd"], key: "f" }}
                      />
                    )}
                    <Action.SubmitForm
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      onSubmit={async () => {
                        await search(searchText);
                      }}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                    />
                    <Action.CopyToClipboard
                      icon={Icon.CopyClipboard}
                      title="Copy URL"
                      content={job.url}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        };

        return (
          <>
            {favoriteJobs.length > 0 && (
              <List.Section title="Favorites" subtitle={favoriteJobs.length + ""}>
                {favoriteJobs.map(renderJob)}
              </List.Section>
            )}
            {otherJobs.length > 0 && (
              <List.Section title="Results" subtitle={otherJobs.length + ""}>
                {otherJobs.map(renderJob)}
              </List.Section>
            )}
          </>
        );
      })()}
    </List>
  );
}

interface BuildProps {
  jenkins: Jenkins;
  jobs: string[];
}

function Build(props: BuildProps) {
  const [builds, setBuilds] = useState<BuildType[]>([]);
  const [subJobs, setSubJobs] = useState<JobWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchText, setSearchText] = useState<string>("");
  const [jobClass, setJobClass] = useState<string>("");

  const search = useCallback(
    async function search(text: string) {
      if (searchText !== text) {
        setSearchText(text);
      }
      setIsLoading(true);
      try {
        const jenkinsAPI = new JenkinsAPI(props.jenkins);
        const resp = await jenkinsAPI.inspect(props.jobs);

        const filteredBuilds = resp.builds?.filter((build) => build.number.toString().includes(text)) ?? [];

        setBuilds(filteredBuilds);
        setJobClass(resp._class || "");

        // If this job has sub-jobs (is a folder/multibranch), aggregate builds from all branches
        if ((resp.jobs?.length ?? 0) > 0 && filteredBuilds.length === 0 && !text) {
          // For multibranch projects, collect builds from active branches
          try {
            const activeBranches = resp.jobs?.filter(job => {
              // Only fetch from branches that have been built
              return job.color && !job.color.startsWith('grey') &&
                     !job.color.startsWith('disabled') && job.color !== 'notbuilt';
            }).slice(0, 10) ?? []; // Limit to top 10 most active branches

            const allBuilds: BuildType[] = [];

            // Fetch builds from each active branch
            for (const branch of activeBranches) {
              try {
                const branchPath = branch.url
                  .replace(jenkinsAPI.jenkins.url, "")
                  .split("/")
                  .filter((p) => p && p !== "job");
                const branchResp = await jenkinsAPI.inspect(branchPath);

                // Add branch builds with branch name
                const builds = (branchResp.builds || []).slice(0, 5).map(build => ({
                  ...build,
                  _branchName: branch.name, // Add branch name for display
                }));
                allBuilds.push(...builds);
              } catch (err) {
                // Skip branches that fail to load
              }
            }

            if (allBuilds.length > 0) {
              // Sort by timestamp (most recent first)
              allBuilds.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
              setBuilds(allBuilds.slice(0, 50)); // Show top 50 most recent builds
              setSubJobs([]);
              return;
            }
          } catch (err) {
            // If aggregation fails, fall through to show branches
          }
        }

        // Show branches list only when searching
        if ((resp.jobs?.length ?? 0) > 0 && filteredBuilds.length === 0 && text) {
          const jobsWithStatus = resp.jobs?.map(job => ({
            ...job,
            isBuilding: job.color?.includes("anime"),
          })) ?? [];

          const filteredJobs = jobsWithStatus
            .filter(job => job.name.toLowerCase().includes(text.toLowerCase()))
            .slice(0, 50);

          setSubJobs(filteredJobs);
        } else {
          setSubJobs([]);
        }
      } catch (err) {
        showToast({ style: Toast.Style.Failure, title: "Search Failed", message: String(err) });
      } finally {
        setIsLoading(false);
      }
    },
    [props.jenkins, props.jobs, searchText],
  );

  useEffect(() => {
    search("");
  }, [search]);

  return (
    <List
      isLoading={isLoading}
      navigationTitle={subJobs.length > 0 ? `Jobs - ${props.jobs.join(" / ")}` : `Builds - ${props.jobs.join(" / ")}`}
      onSearchTextChange={search}
      searchBarPlaceholder={subJobs.length > 0 ? "Search Jobs..." : "Search Builds..."}
      throttle
    >
      {subJobs.length > 0 && (
        <List.Section title="Jobs / Branches" subtitle={subJobs.length + ""}>
          {subJobs.map((job) => {
            const getStatusIcon = () => {
              if (!job.color) return { source: Icon.Circle, tintColor: Color.SecondaryText };
              if (job.color.includes("anime")) return { source: Icon.CircleProgress, tintColor: Color.Blue };
              if (job.color.startsWith("blue")) return { source: Icon.CheckCircle, tintColor: Color.Green };
              if (job.color.startsWith("red")) return { source: Icon.XMarkCircle, tintColor: Color.Red };
              if (job.color.startsWith("yellow")) return { source: Icon.ExclamationMark, tintColor: Color.Yellow };
              return { source: Icon.Circle, tintColor: Color.SecondaryText };
            };

            return (
              <List.Item
                key={job.url}
                title={job.name}
                icon={getStatusIcon()}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      {hasSubJobs(job) ? (
                        <Action.Push
                          icon={Icon.List}
                          title="View Jobs"
                          target={
                            <Build
                              jenkins={props.jenkins}
                              jobs={[...props.jobs, job.path ?? job.name]}
                            />
                          }
                        />
                      ) : (
                        <Action.Push
                          icon={Icon.Box}
                          title="Builds"
                          target={
                            <Build
                              jenkins={props.jenkins}
                              jobs={[...props.jobs, job.path ?? job.name]}
                            />
                          }
                        />
                      )}
                      <Action.OpenInBrowser title="Open in Browser" url={job.url} />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
      {builds.length === 0 && subJobs.length === 0 && !isLoading && (
        <List.EmptyView
          title="No Builds Found"
          description="This job hasn't been built yet"
          icon={Icon.XMarkCircle}
        />
      )}
      {builds.length > 0 && (
        <List.Section title="Builds" subtitle={builds.length + ""}>
        {builds.map((build) => {
          const getStatusIcon = () => {
            if (build.building) {
              return { source: Icon.CircleProgress, tintColor: Color.Blue };
            }
            switch (build.result) {
              case "SUCCESS":
                return { source: Icon.CheckCircle, tintColor: Color.Green };
              case "FAILURE":
                return { source: Icon.XMarkCircle, tintColor: Color.Red };
              case "UNSTABLE":
                return { source: Icon.ExclamationMark, tintColor: Color.Yellow };
              case "ABORTED":
                return { source: Icon.Circle, tintColor: Color.SecondaryText };
              default:
                return { source: Icon.Circle, tintColor: Color.SecondaryText };
            }
          };

          const formatDuration = (ms?: number): string => {
            if (!ms) return "";
            const seconds = Math.floor(ms / 1000);
            if (seconds < 60) return `${seconds}s`;
            const minutes = Math.floor(seconds / 60);
            if (minutes < 60) return `${minutes}m`;
            const hours = Math.floor(minutes / 60);
            return `${hours}h ${minutes % 60}m`;
          };

          const formatTimestamp = (ts?: number): string => {
            if (!ts) return "";
            const date = new Date(ts);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHours / 24);

            if (diffMins < 60) return `${diffMins}m ago`;
            if (diffHours < 24) return `${diffHours}h ago`;
            if (diffDays < 7) return `${diffDays}d ago`;
            return date.toLocaleDateString();
          };

          const accessories: List.Item.Accessory[] = [];

          if (build.building) {
            accessories.push({ tag: { value: "Building", color: Color.Blue } });
          } else if (build.result) {
            const resultColors: Record<string, Color> = {
              SUCCESS: Color.Green,
              FAILURE: Color.Red,
              UNSTABLE: Color.Yellow,
              ABORTED: Color.SecondaryText,
            };
            accessories.push({
              tag: { value: build.result, color: resultColors[build.result] || Color.SecondaryText },
            });
          }

          if (build.duration) {
            accessories.push({ text: formatDuration(build.duration) });
          }

          if (build.timestamp) {
            accessories.push({ text: formatTimestamp(build.timestamp), tooltip: new Date(build.timestamp).toLocaleString() });
          }

          const isPipelineJob = jobClass.includes("WorkflowJob") ||
                                jobClass.includes("WorkflowMultiBranchProject") ||
                                jobClass.includes("workflow");

          return (
            <List.Item
              key={build.number}
              title={build._branchName ? `${build._branchName} / #${build.number}` : `#${build.number}`}
              icon={getStatusIcon()}
              accessories={accessories}
              actions={
              <ActionPanel>
                <ActionPanel.Section>
                  {isPipelineJob ? (
                    <>
                      <Action.Push
                        icon={Icon.List}
                        title="View Pipeline Stages"
                        target={<PipelineStages jenkins={props.jenkins} buildUrl={build.url} buildNumber={build.number} />}
                      />
                      <Action.Push
                        icon={Icon.Text}
                        title="View Console Log"
                        target={<ConsoleLog jenkins={props.jenkins} buildUrl={build.url} buildNumber={build.number} />}
                        shortcut={{ modifiers: ["cmd"], key: "l" }}
                      />
                    </>
                  ) : (
                    <>
                      <Action.Push
                        icon={Icon.Text}
                        title="View Console Log"
                        target={<ConsoleLog jenkins={props.jenkins} buildUrl={build.url} buildNumber={build.number} />}
                      />
                      <Action.Push
                        icon={Icon.List}
                        title="View Pipeline Stages"
                        target={<PipelineStages jenkins={props.jenkins} buildUrl={build.url} buildNumber={build.number} />}
                        shortcut={{ modifiers: ["cmd"], key: "p" }}
                      />
                    </>
                  )}
                  <Action.OpenInBrowser title="Open in Browser" url={build.url} />
                  <Action.OpenInBrowser title="Console in Browser" url={`${build.url}console`} />
                  <Action.SubmitForm
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onSubmit={async () => {
                      await search(searchText);
                    }}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                  <Action.CopyToClipboard
                    icon={Icon.CopyClipboard}
                    title="Copy URL"
                    content={build.url}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
          );
        })}
        </List.Section>
      )}
    </List>
  );
}

interface ConsoleLogProps {
  jenkins: Jenkins;
  buildUrl: string;
  buildNumber: number;
}

function ConsoleLog(props: ConsoleLogProps) {
  const [log, setLog] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchLog = async () => {
      setIsLoading(true);
      try {
        const jenkinsAPI = new JenkinsAPI(props.jenkins);
        const consoleLog = await jenkinsAPI.getConsoleLog(props.buildUrl);
        setLog(consoleLog);
      } catch (err) {
        showToast({ style: Toast.Style.Failure, title: "Failed to Load Console Log", message: String(err) });
      } finally {
        setIsLoading(false);
      }
    };

    fetchLog();
  }, [props.buildUrl, props.jenkins]);

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Console Log - Build #${props.buildNumber}`}
      searchBarPlaceholder="Search log..."
    >
      <List.Section title="Console Output">
        {log.split("\n").map((line, index) => (
          <List.Item
            key={index}
            title={line || " "}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Line" content={line} />
                <Action.CopyToClipboard
                  title="Copy Full Log"
                  content={log}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action.OpenInBrowser title="Open in Browser" url={`${props.buildUrl}console`} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

interface PipelineStagesProps {
  jenkins: Jenkins;
  buildUrl: string;
  buildNumber: number;
}

function PipelineStages(props: PipelineStagesProps) {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    const fetchStages = async () => {
      setIsLoading(true);
      setError(undefined);
      try {
        const jenkinsAPI = new JenkinsAPI(props.jenkins);
        const pipelineStages = await jenkinsAPI.getPipelineStages(props.buildUrl);

        if (pipelineStages.length === 0) {
          setError("No pipeline stages found. This might not be a pipeline job.");
        } else {
          setStages(pipelineStages);
        }
      } catch (err) {
        setError(String(err));
        showToast({ style: Toast.Style.Failure, title: "Failed to Load Pipeline Stages", message: String(err) });
      } finally {
        setIsLoading(false);
      }
    };

    fetchStages();
  }, [props.buildUrl, props.jenkins]);

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case "SUCCESS":
        return { source: Icon.CheckCircle, tintColor: Color.Green };
      case "FAILED":
      case "FAILURE":
        return { source: Icon.XMarkCircle, tintColor: Color.Red };
      case "IN_PROGRESS":
        return { source: Icon.CircleProgress, tintColor: Color.Blue };
      case "ABORTED":
        return { source: Icon.Circle, tintColor: Color.SecondaryText };
      case "UNSTABLE":
        return { source: Icon.ExclamationMark, tintColor: Color.Yellow };
      case "PAUSED_PENDING_INPUT":
        return { source: Icon.Clock, tintColor: Color.Orange };
      default:
        return { source: Icon.Circle, tintColor: Color.SecondaryText };
    }
  };

  if (error) {
    return (
      <List navigationTitle={`Pipeline Stages - Build #${props.buildNumber}`}>
        <List.EmptyView
          title="No Pipeline Stages"
          description={error}
          icon={Icon.XMarkCircle}
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Pipeline Stages - Build #${props.buildNumber}`}
    >
      <List.Section title="Stages" subtitle={stages.length + ""}>
        {stages.map((stage, index) => {
          const accessories: List.Item.Accessory[] = [];

          accessories.push({ text: formatDuration(stage.durationMillis) });

          const statusColors: Record<string, Color> = {
            SUCCESS: Color.Green,
            FAILED: Color.Red,
            FAILURE: Color.Red,
            IN_PROGRESS: Color.Blue,
            ABORTED: Color.SecondaryText,
            UNSTABLE: Color.Yellow,
            PAUSED_PENDING_INPUT: Color.Orange,
          };

          const statusUpper = stage.status.toUpperCase();
          accessories.push({
            tag: { value: stage.status, color: statusColors[statusUpper] || Color.SecondaryText },
          });

          return (
            <List.Item
              key={stage.id}
              title={`${index + 1}. ${stage.name}`}
              icon={getStatusIcon(stage.status)}
              accessories={accessories}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser title="Open in Browser" url={props.buildUrl} />
                  <Action.CopyToClipboard
                    title="Copy Stage Name"
                    content={stage.name}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

interface LastBuildLogProps {
  jenkins: Jenkins;
  jobUrl: string;
  jobName: string;
}

function LastBuildLog(props: LastBuildLogProps) {
  const [log, setLog] = useState<string>("");
  const [buildNumber, setBuildNumber] = useState<number | undefined>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    const fetchLastBuildLog = async () => {
      setIsLoading(true);
      setError(undefined);
      try {
        const jenkinsAPI = new JenkinsAPI(props.jenkins);
        const jobPathParts = props.jobUrl
          .replace(props.jenkins.url, "")
          .split("/")
          .filter((p) => p && p !== "job");

        const jobInfo = await jenkinsAPI.inspect(jobPathParts);

        if (!jobInfo.builds || jobInfo.builds.length === 0) {
          setError("No builds found for this job");
          setIsLoading(false);
          return;
        }

        const lastBuild = jobInfo.builds[0];
        setBuildNumber(lastBuild.number);

        const consoleLog = await jenkinsAPI.getConsoleLog(lastBuild.url);
        setLog(consoleLog);
      } catch (err) {
        setError(String(err));
        showToast({ style: Toast.Style.Failure, title: "Failed to Load Console Log", message: String(err) });
      } finally {
        setIsLoading(false);
      }
    };

    fetchLastBuildLog();
  }, [props.jobUrl, props.jenkins]);

  if (error) {
    return (
      <List navigationTitle={`Console Log - ${props.jobName}`}>
        <List.EmptyView
          title="Failed to Load Console Log"
          description={error}
          icon={Icon.XMarkCircle}
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Console Log - ${props.jobName}${buildNumber ? ` #${buildNumber}` : ""}`}
      searchBarPlaceholder="Search log..."
    >
      <List.Section title="Console Output">
        {log.split("\n").map((line, index) => (
          <List.Item
            key={index}
            title={line || " "}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Line" content={line} />
                <Action.CopyToClipboard
                  title="Copy Full Log"
                  content={log}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action.OpenInBrowser title="Open in Browser" url={`${props.jobUrl}${buildNumber}/console`} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
