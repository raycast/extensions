import { fetchPorts } from "./fetchPorts";
import { Process, fetchProcesses } from "./fetchProcesses";
import { uniq } from "./uniq";

export type ProcessWithPorts = Process & { ports: string[] };

export const fetchProcessesWithPorts = async (): Promise<ProcessWithPorts[]> => {
  const [processes, ports] = await Promise.all([fetchProcesses(), fetchPorts()]);

  return processes.map<ProcessWithPorts>((p) => ({
    ...p,
    ports: uniq(ports.filter((port) => port.pid === p.id).map((p) => p.port)),
  }));
};
