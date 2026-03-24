import { JenkinsJob } from "../types";

/**
 * Sort jobs: favorites first, then recently used, then alphabetical by path.
 * Within each group, maintain relative order (favorites by favorites array order,
 * recent by recency, rest alphabetical).
 */
export function sortJobs(
  jobs: JenkinsJob[],
  favorites: string[],
  recentJobs: string[],
): JenkinsJob[] {
  const favSet = new Set(favorites);
  const recentSet = new Set(recentJobs);

  const favJobs: JenkinsJob[] = [];
  const recentJobsList: JenkinsJob[] = [];
  const rest: JenkinsJob[] = [];

  for (const job of jobs) {
    if (favSet.has(job.path)) {
      favJobs.push(job);
    } else if (recentSet.has(job.path)) {
      recentJobsList.push(job);
    } else {
      rest.push(job);
    }
  }

  // Sort favorites by their position in the favorites array
  favJobs.sort((a, b) => favorites.indexOf(a.path) - favorites.indexOf(b.path));
  // Sort recent by their position in the recentJobs array (most recent first)
  recentJobsList.sort(
    (a, b) => recentJobs.indexOf(a.path) - recentJobs.indexOf(b.path),
  );
  // Sort rest alphabetically by path (case-insensitive)
  rest.sort((a, b) => a.path.toLowerCase().localeCompare(b.path.toLowerCase()));

  return [...favJobs, ...recentJobsList, ...rest];
}
