import { Process } from "../types";
import { fetchRunningProcesses } from "../utils/process";

type SortOrder = "asc" | "desc";
type SortField = keyof Process;

type Input = {
  /**
   * Optional array of search terms to filter processes.
   * For single process search, provide an array with one element.
   * Example: ["Logi"] will find all processes containing "Logi" in their name
   * Example: ["Chrome", "Firefox"] will find all processes containing either "Chrome" or "Firefox"
   */
  searchTerm?: string[];
  /**
   * Field to sort by (defaults to 'mem')
   */
  sortBy?: SortField;
  /**
   * Sort order (defaults to 'desc')
   */
  sortOrder?: SortOrder;
};

const sortProcesses = (processes: Process[], field: SortField = "mem", order: SortOrder = "desc"): Process[] => {
  return [...processes].sort((a, b) => {
    const valueA = a[field];
    const valueB = b[field];

    if (valueA === valueB) return 0;
    if (valueA === undefined) return 1;
    if (valueB === undefined) return -1;

    const comparison = valueA < valueB ? -1 : 1;
    return order === "desc" ? -comparison : comparison;
  });
};

const filterProcessesBySearchTerm = (processes: Process[], searchTerms?: string[]): Process[] => {
  if (!searchTerms?.length) return processes;

  return processes.filter((p) => {
    const searchIn = `${p.path} ${p.processName} ${p.appName || ""}`.toLowerCase();
    return searchTerms.some((term) => searchIn.includes(term.toLowerCase()));
  });
};

const validateResults = (processes: Process[], searchTerms?: string[]): void => {
  if (processes.length === 0 && searchTerms?.length) {
    throw new Error(`No processes found matching "${searchTerms.join(", ")}"`);
  }
};

/**
 * List out all running processes.
 * This tool can be called by AI to answer queries like,
 * "What processes are running right now?"
 * or "list processes containing xyz"
 * or "list processes containing xyz and abc"
 *
 * Throws an error if no processes are found matching the search terms
 */
export default async function listProcesses(input?: Input): Promise<Process[]> {
  const processes = await fetchRunningProcesses();

  const filteredProcesses = filterProcessesBySearchTerm(processes, input?.searchTerm);
  validateResults(filteredProcesses, input?.searchTerm);

  return sortProcesses(filteredProcesses, input?.sortBy, input?.sortOrder);
}
