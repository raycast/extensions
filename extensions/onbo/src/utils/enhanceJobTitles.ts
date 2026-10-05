import type { RoleListing } from "../models/RolesAPI";
import { formatLocationsString } from "./format";

/**
 * Minimal job shape used by enhanceJobTitles for formatting titles with location.
 */
interface JobWithLocation {
  id: number;
  company: string;
  role: string;
  locations?: string[];
}

/**
 * Derives a human-readable identifier from a job URL (e.g., Workday R-number),
 * falling back to a shortened numeric token or the internal id suffix.
 *
 * @param job - Object containing application_url and id.
 * @returns A compact job identifier string for display.
 */
const getJobIdentifier = (job: { application_url: string; id: number }) => {
  const url = job.application_url;

  // Workday: _R123456 (keep as-is, they're reasonable length)
  const workdayMatch = url.match(/_(R\d+)/);
  if (workdayMatch) return workdayMatch[1];

  // iCIMS: /jobs/12345/
  const icamsMatch = url.match(/\/jobs\/(\d+)\//);
  if (icamsMatch) return shortenNumber(icamsMatch[1]);

  // SuccessFactors/L3Harris: /job/title/12345/
  const successFactorsMatch = url.match(/\/job\/[^/]+\/(\d+)\//);
  if (successFactorsMatch) return shortenNumber(successFactorsMatch[1]);

  // Greenhouse: /jobs/12345
  const greenhouseMatch = url.match(/\/jobs\/(\d+)(?:\?|$)/);
  if (greenhouseMatch) return shortenNumber(greenhouseMatch[1]);

  // Lever: /12345-job-title or /job-title-12345
  const leverMatch = url.match(/\/(\d{4,})-|\/.*-(\d{4,})(?:\?|$)/);
  if (leverMatch) return shortenNumber(leverMatch[1] || leverMatch[2]);

  // Generic: longest number in URL
  const allNumbers = url.match(/\d{4,}/g);
  if (allNumbers) {
    const longest = allNumbers.reduce((longest, current) => (current.length > longest.length ? current : longest));
    return shortenNumber(longest);
  }

  // Fallback to API ID
  return `#${job.id.toString().slice(-4)}`;
};

/**
 * Shortens a long numeric identifier, preserving only the last 4 digits with a leading ellipsis.
 *
 * @param num - Stringified number to shorten.
 */
const shortenNumber = (num: string) => {
  if (num.length <= 6) return num;
  return `...${num.slice(-4)}`;
};

// Overload: preserve JobInternshipAPIObject fields like `category`
export function enhanceJobTitles(jobs: RoleListing[]): Array<RoleListing & { displayTitle: string }>;

// Generic fallback
export function enhanceJobTitles<T extends JobWithLocation & { application_url: string }>(
  jobs: T[],
): Array<T & { displayTitle: string }>;

/**
 * Adds a displayTitle to each job to disambiguate duplicate titles by including
 * a compact identifier and/or location as needed.
 *
 * @param jobs - Array of jobs to enhance.
 * @returns New array with displayTitle set for each entry.
 */
export function enhanceJobTitles<T extends JobWithLocation & { application_url: string }>(
  jobs: T[],
): Array<T & { displayTitle: string }> {
  const groups = jobs.reduce(
    (acc, job) => {
      const key = `${job.company}|${job.role}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(job);
      return acc;
    },
    {} as Record<string, T[]>,
  );

  return jobs.map((job) => {
    const key = `${job.company}|${job.role}`;
    const duplicates = groups[key];

    if (duplicates.length > 1) {
      const locationText = formatLocationsString(job.locations);

      const allLocations = duplicates.map((d) => formatLocationsString(d.locations));
      const allSameLocation = allLocations.every((loc) => loc === allLocations[0]);

      if (allSameLocation) {
        const jobId = getJobIdentifier(job);
        return {
          ...job,
          displayTitle: `${job.role} (${jobId})`,
        };
      } else {
        const locationCount = duplicates.filter((d) => formatLocationsString(d.locations) === locationText).length;

        if (locationCount > 1) {
          const jobId = getJobIdentifier(job);
          return {
            ...job,
            displayTitle: `${job.role} (${locationText} • ${jobId})`,
          };
        } else {
          return {
            ...job,
            displayTitle: `${job.role} (${locationText})`,
          };
        }
      }
    }

    return {
      ...job,
      displayTitle: job.role,
    };
  });
}
