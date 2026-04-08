import { PortProcess } from "../types";
import { fetchPortProcesses } from "../utils/process";

type SortOrder = "asc" | "desc";
type SortField = "port" | "processName" | "id" | "protocol";

type Input = {
  /**
   * Optional array of search terms to filter processes.
   * Can be port numbers, process names, or command lines.
   */
  searchTerm?: string[];
  /**
   * Field to sort by (defaults to 'port')
   */
  sortBy?: SortField;
  /**
   * Sort order (defaults to 'asc')
   */
  sortOrder?: SortOrder;
};

const sortProcesses = (
  processes: PortProcess[],
  field: SortField = "port",
  order: SortOrder = "asc",
): PortProcess[] => {
  return [...processes].sort((a, b) => {
    const valueA = a[field as keyof PortProcess];
    const valueB = b[field as keyof PortProcess];

    if (valueA === valueB) return 0;
    if (valueA === undefined) return 1;
    if (valueB === undefined) return -1;

    const comparison = valueA < valueB ? -1 : 1;
    return order === "desc" ? -comparison : comparison;
  });
};

const filterProcessesBySearchTerm = (processes: PortProcess[], searchTerms?: string[]): PortProcess[] => {
  if (!searchTerms?.length) return processes;

  return processes.filter((p) => {
    const searchIn = `${p.port} ${p.processName} ${p.commandLine || ""} ${p.id}`.toLowerCase();
    return searchTerms.some((term) => searchIn.includes(term.toLowerCase()));
  });
};

/**
 * List out all processes listening on a port.
 * This tool can be called by AI to answer queries like,
 * "What processes are using port 3000?"
 * or "list all programs that have open ports"
 *
 * Throws an error if no processes are found matching the search terms
 */
export default async function listPortProcesses(input?: Input): Promise<PortProcess[]> {
  const processes = await fetchPortProcesses();

  const filteredProcesses = filterProcessesBySearchTerm(processes, input?.searchTerm);

  if (filteredProcesses.length === 0 && input?.searchTerm?.length) {
    throw new Error(`No port-occupying processes found matching "${input.searchTerm.join(", ")}"`);
  }

  return sortProcesses(filteredProcesses, input?.sortBy, input?.sortOrder);
}
