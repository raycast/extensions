import {
  List,
  Icon,
  showToast,
  Toast,
  ActionPanel,
  Action,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState, useEffect, useMemo } from "react";
import { fetchJobTree } from "./api/jenkins";
import {
  getFavorites,
  getRecentJobs,
  addFavorite,
  removeFavorite,
} from "./storage";
import { sortJobs } from "./utils/sort";
import { handleFetchError } from "./utils/errors";
import { JenkinsJob } from "./types";
import { relativeTime } from "./utils/time";
import { BuildParamForm } from "./components/BuildParamForm";
import { getStatusIcon } from "./utils/status";
import BuildHistory from "./build-history";

function getAccessories(
  job: JenkinsJob,
  isFavorite: boolean,
): List.Item.Accessory[] {
  const acc: List.Item.Accessory[] = [];
  if (isFavorite) acc.push({ icon: Icon.Star, tooltip: "Favorite" });
  if (job.lastBuild) {
    acc.push({ text: `#${job.lastBuild.number}` });
    acc.push({
      text: relativeTime(job.lastBuild.timestamp),
      tooltip: new Date(job.lastBuild.timestamp).toLocaleString(),
    });
  } else {
    acc.push({ text: "No builds" });
  }
  return acc;
}

function JobActions({
  job,
  isFavorite,
  onToggleFavorite,
}: {
  job: JenkinsJob;
  isFavorite: boolean;
  onToggleFavorite: (path: string) => void;
}) {
  const { push } = useNavigation();
  return (
    <ActionPanel>
      <Action
        title="Trigger Build"
        icon={Icon.Play}
        onAction={() => push(<BuildParamForm job={job} />)}
      />
      <Action.OpenInBrowser
        title="Open in Browser"
        url={job.url}
        shortcut={{ modifiers: ["cmd"], key: "o" }}
      />
      <Action.CopyToClipboard
        title="Copy Job URL"
        content={job.url}
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
      />
      <Action
        title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
        icon={isFavorite ? Icon.StarDisabled : Icon.Star}
        shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
        onAction={() => onToggleFavorite(job.path)}
      />
      <Action
        title="View Build History"
        icon={Icon.Clock}
        shortcut={{ modifiers: ["cmd"], key: "h" }}
        onAction={() => push(<BuildHistory jobPath={job.path} />)}
      />
    </ActionPanel>
  );
}

export default function TriggerBuild() {
  const { data, isLoading, error } = useCachedPromise(fetchJobTree, [], {
    keepPreviousData: true,
  });
  const favorites = useCachedPromise(getFavorites);
  const recentJobs = useCachedPromise(getRecentJobs);

  const [favoriteSet, setFavoriteSet] = useState<Set<string>>(new Set());
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    if (favorites.data) setFavoriteSet(new Set(favorites.data));
  }, [favorites.data]);

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load jobs",
        message: handleFetchError(error),
      });
    }
  }, [error]);

  async function toggleFavorite(path: string) {
    if (favoriteSet.has(path)) {
      await removeFavorite(path);
      setFavoriteSet((prev) => {
        const s = new Set(prev);
        s.delete(path);
        return s;
      });
    } else {
      await addFavorite(path);
      setFavoriteSet((prev) => new Set(prev).add(path));
    }
  }

  const favoritePaths = Array.from(favoriteSet);
  const sortedJobs = sortJobs(data ?? [], favoritePaths, recentJobs.data ?? []);

  const filteredJobs = useMemo(() => {
    if (!searchText) return sortedJobs;
    const q = searchText.toLowerCase();
    return sortedJobs.filter(
      (j) =>
        j.path.toLowerCase().includes(q) || j.name.toLowerCase().includes(q),
    );
  }, [sortedJobs, searchText]);

  const favoriteJobs = filteredJobs.filter((j) => favoriteSet.has(j.path));
  const otherJobs = filteredJobs.filter((j) => !favoriteSet.has(j.path));

  // Group non-favorite jobs by parent folder (everything before the last "/")
  const grouped = new Map<string, typeof otherJobs>();
  for (const job of otherJobs) {
    const slashIdx = job.path.lastIndexOf("/");
    const folder = slashIdx > 0 ? job.path.slice(0, slashIdx) : "Other";
    if (!grouped.has(folder)) grouped.set(folder, []);
    grouped.get(folder)!.push(job);
  }

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search jobs..."
    >
      {!isLoading && filteredJobs.length === 0 && (
        <List.EmptyView
          title="No Jenkins Jobs Found"
          description="Your Jenkins instance returned no triggerable jobs. Check your Jenkins URL and credentials in preferences."
        />
      )}
      {favoriteJobs.length > 0 && (
        <List.Section title="Favorites">
          {favoriteJobs.map((job) => (
            <List.Item
              key={job.path}
              title={job.name}
              subtitle={job.path}
              icon={getStatusIcon(job.status)}
              accessories={getAccessories(job, true)}
              actions={
                <JobActions
                  job={job}
                  isFavorite={true}
                  onToggleFavorite={toggleFavorite}
                />
              }
            />
          ))}
        </List.Section>
      )}
      {Array.from(grouped.entries()).map(([folder, jobs]) => (
        <List.Section key={folder} title={folder}>
          {jobs.map((job) => (
            <List.Item
              key={job.path}
              title={job.name}
              icon={getStatusIcon(job.status)}
              accessories={getAccessories(job, false)}
              actions={
                <JobActions
                  job={job}
                  isFavorite={false}
                  onToggleFavorite={toggleFavorite}
                />
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
