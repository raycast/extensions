import {
  Action,
  ActionPanel,
  Cache,
  Clipboard,
  Color,
  Icon,
  List,
  LocalStorage,
  PopToRootType,
  Toast,
  showHUD,
  showToast,
} from "@raycast/api";
import { useFrecencySorting } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import {
  FAVORITE_JOBS_KEY,
  buildJobMarkdown,
  buildJobSummary,
  buildPostJobUrl,
  filterJobs,
  jobKey,
  parseFavoriteJobKeys,
  resolveJobsUrl,
  serializeFavoriteJobKeys,
  sortedJobFilterOptions,
  type RaycastJob,
} from "./jobs-feed";
import {
  fetchFreshJobs,
  loadCachedJobs as loadCachedJobsFromRuntime,
} from "./jobs-runtime";
import { markdownLink, withRaycastUtm } from "./links";
import { jobDetailMetadata } from "./raycast-ui";

const cache = new Cache();

function getConfiguredJobs() {
  return { jobsUrl: resolveJobsUrl() };
}

function loadCachedJobs(jobsUrl: string) {
  return loadCachedJobsFromRuntime(cache, jobsUrl);
}

async function loadFavoriteJobs() {
  const raw = await LocalStorage.getItem<string>(FAVORITE_JOBS_KEY);
  if (!raw) return new Set<string>();

  try {
    return new Set(parseFavoriteJobKeys(raw));
  } catch {
    await LocalStorage.removeItem(FAVORITE_JOBS_KEY);
    return new Set<string>();
  }
}

async function persistFavoriteJobs(favorites: Set<string>) {
  await LocalStorage.setItem(
    FAVORITE_JOBS_KEY,
    serializeFavoriteJobKeys(favorites),
  );
}

function jobIcon(job: RaycastJob) {
  if (job.sponsored || job.featured) return Icon.Star;
  return Icon.Document;
}

function jobAccessories(job: RaycastJob, isFavorite: boolean) {
  const accessories: List.Item.Accessory[] = [];

  if (isFavorite) {
    accessories.push({
      icon: { source: Icon.Star, tintColor: Color.Yellow },
    });
  }
  if (!isFavorite && job.sponsored) {
    accessories.push({ icon: { source: Icon.Star, tintColor: Color.Yellow } });
  } else if (!isFavorite && job.featured) {
    accessories.push({ icon: { source: Icon.Star, tintColor: Color.Blue } });
  }
  if (job.claimedEmployer) {
    accessories.push({
      icon: { source: Icon.CheckCircle, tintColor: Color.Green },
    });
  }

  return accessories;
}

export default function Command() {
  const configuredJobs = getConfiguredJobs();
  const cachedJobs = loadCachedJobs(configuredJobs.jobsUrl);
  const [jobs, setJobs] = useState<RaycastJob[]>(cachedJobs.entries);
  const [generatedAt, setGeneratedAt] = useState(cachedJobs.generatedAt);
  const [isLoading, setIsLoading] = useState(jobs.length === 0);
  const [filter, setFilter] = useState("all");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  async function refreshJobs(showSuccess = false) {
    setIsLoading(true);
    try {
      const nextFeed = await fetchFreshJobs({ cache });
      setJobs(nextFeed.entries);
      setGeneratedAt(nextFeed.generatedAt);
      if (showSuccess) {
        await showToast({
          style: Toast.Style.Success,
          title: "HeyClaude jobs refreshed",
          message: `${nextFeed.entries.length} active jobs`,
        });
      }
    } catch (error) {
      if (jobs.length === 0 || showSuccess) {
        await showToast({
          style: Toast.Style.Failure,
          title: showSuccess ? "Could not refresh jobs" : "Could not load jobs",
          message:
            error instanceof Error ? error.message : "Unknown jobs feed error",
        });
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refreshJobs(false);
    // Run only once on command open. Manual refresh is exposed as an action.
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function initializeFavorites() {
      const loaded = await loadFavoriteJobs();
      if (!cancelled) setFavorites(loaded);
    }

    void initializeFavorites();
    return () => {
      cancelled = true;
    };
  }, []);

  const filterOptions = useMemo(() => sortedJobFilterOptions(), []);
  const displayedJobs = useMemo(
    () => filterJobs(jobs, filter, favorites),
    [filter, jobs, favorites],
  );
  const {
    data: rankedJobs,
    visitItem,
    resetRanking,
  } = useFrecencySorting(displayedJobs, {
    namespace: "jobs",
    key: jobKey,
  });

  async function copyRoleSummary(job: RaycastJob) {
    await Clipboard.copy(buildJobSummary(job));
    await visitItem(job);
    await showHUD(`Copied ${job.title}`, {
      popToRootType: PopToRootType.Immediate,
    });
  }

  async function toggleFavorite(job: RaycastJob) {
    const key = jobKey(job);
    const next = new Set(favorites);
    const isFavorite = next.has(key);

    if (isFavorite) next.delete(key);
    else next.add(key);

    setFavorites(next);
    await persistFavoriteJobs(next);
    await visitItem(job);
    await showToast({
      style: Toast.Style.Success,
      title: isFavorite ? "Removed favorite" : "Added favorite",
      message: job.title,
    });
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search Claude, MCP, AI, and agent jobs..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter jobs"
          value={filter}
          onChange={setFilter}
        >
          {filterOptions.map((option) => (
            <List.Dropdown.Item
              key={option.value}
              value={option.value}
              title={option.title}
            />
          ))}
        </List.Dropdown>
      }
    >
      {rankedJobs.map((job) => {
        const isFavorite = favorites.has(jobKey(job));
        const detailMarkdown = buildJobMarkdown(job);
        const webUrl = withRaycastUtm(job.webUrl, "job-detail");
        const postJobUrl = withRaycastUtm(
          buildPostJobUrl(configuredJobs.jobsUrl),
          "jobs-post",
        );

        return (
          <List.Item
            key={jobKey(job)}
            title={job.title}
            subtitle={job.company}
            keywords={[
              job.company,
              job.location,
              job.type || "",
              job.compensation || "",
              job.sourceLabel,
              ...(job.labels ?? []),
            ].filter(Boolean)}
            icon={jobIcon(job)}
            accessories={jobAccessories(job, isFavorite)}
            detail={
              <List.Item.Detail
                markdown={detailMarkdown}
                metadata={jobDetailMetadata(job, generatedAt)}
              />
            }
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Use">
                  <Action.OpenInBrowser
                    title="Apply on Employer Site"
                    url={job.applyUrl}
                    icon={Icon.ArrowRight}
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
                    onOpen={() => void visitItem(job)}
                  />
                  <Action.OpenInBrowser
                    title="Open on HeyClaude"
                    url={webUrl}
                    icon={Icon.Globe}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                    onOpen={() => void visitItem(job)}
                  />
                  <Action
                    title="Copy Role Summary"
                    icon={Icon.Clipboard}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                    onAction={() => void copyRoleSummary(job)}
                  />
                  <Action.CopyToClipboard
                    title="Copy Apply URL"
                    content={job.applyUrl}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    onCopy={() => void visitItem(job)}
                  />
                  {job.companyUrl ? (
                    <Action.OpenInBrowser
                      title="Open Company Site"
                      url={job.companyUrl}
                      onOpen={() => void visitItem(job)}
                    />
                  ) : null}
                  {job.sourceUrl ? (
                    <Action.OpenInBrowser
                      title="Open Source Listing"
                      url={job.sourceUrl}
                      onOpen={() => void visitItem(job)}
                    />
                  ) : null}
                </ActionPanel.Section>
                <ActionPanel.Section title="Share">
                  <Action.CopyToClipboard
                    title="Copy Job URL"
                    content={job.webUrl}
                    onCopy={() => void visitItem(job)}
                  />
                  <Action.CopyToClipboard
                    title="Copy Markdown Link"
                    content={markdownLink(
                      `${job.company} — ${job.title}`,
                      job.webUrl,
                    )}
                    onCopy={() => void visitItem(job)}
                  />
                  <Action.CopyToClipboard
                    title="Copy Company"
                    content={job.company}
                    onCopy={() => void visitItem(job)}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Create">
                  <Action.CreateQuicklink
                    title="Create Job Quicklink"
                    quicklink={{
                      name: `HeyClaude Job: ${job.company} — ${job.title}`,
                      link: webUrl,
                      icon: Icon.Document,
                    }}
                  />
                  <Action.CreateQuicklink
                    title="Create Jobs Quicklink"
                    quicklink={{
                      name: "HeyClaude Jobs",
                      link: withRaycastUtm(
                        "https://heyclau.de/jobs",
                        "jobs-quicklink",
                      ),
                      icon: Icon.Document,
                    }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Save">
                  <Action
                    title={isFavorite ? "Remove Favorite" : "Add Favorite"}
                    icon={isFavorite ? Icon.StarDisabled : Icon.Star}
                    shortcut={{ modifiers: ["cmd"], key: "f" }}
                    onAction={() => void toggleFavorite(job)}
                  />
                  <Action
                    title="Reset Ranking"
                    icon={Icon.ArrowCounterClockwise}
                    onAction={() => void resetRanking(job)}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Contribute">
                  <Action.OpenInBrowser
                    title="Post a Job"
                    url={postJobUrl}
                    icon={Icon.Plus}
                  />
                  <Action.OpenInBrowser
                    title="Claim or Update Listing"
                    url={withRaycastUtm(
                      `https://heyclau.de/claim?type=job&slug=${encodeURIComponent(job.slug)}`,
                      "job-claim",
                    )}
                    icon={Icon.Person}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Refresh">
                  <Action
                    title="Refresh Jobs"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={() => void refreshJobs(true)}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
      {!isLoading && displayedJobs.length === 0 ? (
        <List.EmptyView
          icon={Icon.Document}
          title={
            filter === "favorites" ? "No favorite jobs yet" : "No jobs found"
          }
          description={
            filter === "favorites"
              ? "Add favorite roles from any job listing to keep them here."
              : "Try another query or filter, or post a role for review."
          }
          actions={
            <ActionPanel>
              <Action
                title="Refresh Jobs"
                icon={Icon.ArrowClockwise}
                onAction={() => void refreshJobs(true)}
              />
              <Action.OpenInBrowser
                title="Post a Job"
                url={buildPostJobUrl(configuredJobs.jobsUrl)}
                icon={Icon.Plus}
              />
            </ActionPanel>
          }
        />
      ) : null}
    </List>
  );
}
