import si from "systeminformation";

interface ProcessInfo {
  pid: number;
  name: string;
  cpu: number;
  mem: number;
}

interface ProcessListResult {
  processes: ProcessInfo[];
  count: number;
}

/**
 * List running processes
 * @returns {Promise<ProcessListResult>} List of running processes
 */
export default async function Command(): Promise<ProcessListResult> {
  try {
    const processes = await si.processes();

    // Return only the most relevant information for each process
    const simplifiedProcesses: ProcessInfo[] = processes.list.map((process) => ({
      pid: process.pid,
      name: process.name,
      cpu: process.cpu,
      mem: process.mem,
    }));

    return {
      processes: simplifiedProcesses,
      count: simplifiedProcesses.length,
    };
  } catch (error) {
    throw new Error(
      `Failed to retrieve process information: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
