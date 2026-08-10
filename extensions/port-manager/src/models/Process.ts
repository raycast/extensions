import path from "path";
import { getNamedPorts } from "../hooks/useNamedPorts";
import { runCommand } from "../utilities/runCommand";
import isDigit from "../utilities/isDigit";
import { LsofPrefix } from "./constants";
import { PortInfo, ProcessInfo } from "./interfaces";

const LSOF_TIMEOUT = 10_000;
const NETSTAT_TIMEOUT = 3_000;
const PS_TIMEOUT = 2_000;
const LSOF_ARGS = ["-n", "+c0", "-iTCP", "-w", "-sTCP:LISTEN", "-P", "-FpcRuLPn"];
const NETSTAT_ARGS = ["-anv", "-p", "tcp"];

let currentProcessesRequest: Promise<Process[]> | undefined;

type ProcessDetails = Pick<ProcessInfo, "name" | "parentPid" | "path" | "parentPath" | "user" | "uid">;
type NamedPortRecord = ReturnType<typeof getNamedPorts>;

export default class Process implements ProcessInfo {
  public path?: string;
  public parentPath?: string;

  private constructor(
    public readonly pid: number,
    public readonly name?: string,
    public readonly parentPid?: number,
    public readonly user?: string,
    public readonly uid?: number,
    public readonly protocol?: string,
    public readonly portInfo?: PortInfo[],
    public readonly internetProtocol?: string
  ) {}

  private static parsePortInfo(value: string, namedPorts: NamedPortRecord): PortInfo | undefined {
    const separatorIndex = value.lastIndexOf(":");
    if (separatorIndex === -1) return;

    const port = Number(value.slice(separatorIndex + 1));
    if (Number.isNaN(port)) return;

    return {
      host: value.slice(0, separatorIndex),
      name: namedPorts[port]?.name,
      port,
    };
  }

  private static parseNetstatPortInfo(value: string, namedPorts: NamedPortRecord): PortInfo | undefined {
    const separatorIndex = value.lastIndexOf(".");
    if (separatorIndex === -1) return;

    const port = Number(value.slice(separatorIndex + 1));
    if (Number.isNaN(port)) return;

    return {
      host: value.slice(0, separatorIndex),
      name: namedPorts[port]?.name,
      port,
    };
  }

  private static async getProcessDetails(pids: number[]) {
    const uniquePids = Array.from(new Set(pids.filter((pid) => Number.isFinite(pid) && pid > 0)));
    const details = new Map<number, ProcessDetails>();

    if (uniquePids.length === 0) {
      return details;
    }

    try {
      const { stdout } = await runCommand(
        "/bin/ps",
        ["-p", uniquePids.join(","), "-o", "pid=", "-o", "ppid=", "-o", "uid=", "-o", "user=", "-o", "comm="],
        {
          timeout: PS_TIMEOUT,
        }
      );

      for (const line of stdout.split("\n")) {
        const match = line.trim().match(/^(\d+)\s+(\d+)\s+(\d+)\s+(\S+)\s+(.+)$/);
        if (match === null) continue;
        const processPath = match[5];

        details.set(Number(match[1]), {
          parentPid: Number(match[2]),
          uid: Number(match[3]),
          user: match[4],
          path: processPath,
          name: path.basename(processPath),
        });
      }
    } catch {
      return details;
    }

    for (const process of details.values()) {
      if (process.parentPid !== undefined) {
        process.parentPath = details.get(process.parentPid)?.path;
      }
    }

    return details;
  }

  private static parseLsof(stdout: string) {
    const namedPorts = getNamedPorts();
    const processes = stdout.split("\np");
    const valuesByProcess: ProcessInfo[] = [];

    for (const process of processes) {
      if (process.length === 0) continue;

      const lines = process.split("\n");
      const values: ProcessInfo = { pid: 0 };

      for (const line of lines) {
        if (line.length === 0) continue;

        const prefix = line[0];
        const value = line.slice(1);
        if (value.length === 0) continue;

        switch (prefix) {
          case LsofPrefix.PROCESS_ID:
            values.pid = Number(value);
            break;
          case LsofPrefix.PROCESS_NAME:
            values.name = value;
            break;
          case LsofPrefix.PARENT_PROCESS_ID:
            values.parentPid = Number(value);
            break;
          case LsofPrefix.USER_NAME:
            values.user = value;
            break;
          case LsofPrefix.USER_ID:
            values.uid = Number(value);
            break;
          case LsofPrefix.PROTOCOL:
            values.protocol = value;
            break;
          case LsofPrefix.PORTS: {
            const portInfo = Process.parsePortInfo(value, namedPorts);
            if (portInfo !== undefined) {
              if (values.portInfo === undefined) {
                values.portInfo = [];
              }
              values.portInfo.push(portInfo);
            }
            break;
          }
          case LsofPrefix.INTERNET_PROTOCOLL:
            values.internetProtocol = value;
            break;
          default:
            if (isDigit(prefix)) values.pid = Number(`${prefix}${value}`);
            break;
        }
      }

      valuesByProcess.push(values);
    }

    return valuesByProcess.filter((process) => process.pid > 0);
  }

  private static getNetstatPidColumnIndex(lines: string[]) {
    const header = lines.find((line) => line.trim().startsWith("Proto "));
    if (header === undefined) return;

    const pidHeaderIndex = header.trim().split(/\s+/).indexOf("pid");
    const pidColumnIndex = pidHeaderIndex - 2;
    return pidColumnIndex > 0 ? pidColumnIndex : undefined;
  }

  private static parseNetstat(stdout: string) {
    const namedPorts = getNamedPorts();
    const valuesByPid = new Map<number, ProcessInfo>();
    const lines = stdout.split("\n");
    const pidColumnIndex = Process.getNetstatPidColumnIndex(lines);
    if (pidColumnIndex === undefined) return [];

    for (const line of lines) {
      const columns = line.trim().split(/\s+/);
      if (columns.length <= pidColumnIndex) continue;

      const [protocol, , , localAddress, , state] = columns;
      const pid = Number(columns[pidColumnIndex]);
      if (state !== "LISTEN" || Number.isNaN(pid) || pid <= 0) continue;

      const portInfo = Process.parseNetstatPortInfo(localAddress, namedPorts);
      if (portInfo === undefined) continue;

      const values = valuesByPid.get(pid) ?? { pid, protocol: "TCP", internetProtocol: protocol, portInfo: [] };
      values.portInfo?.push(portInfo);
      valuesByPid.set(pid, values);
    }

    return Array.from(valuesByPid.values());
  }

  private static async loadFromLsof() {
    const { stdout } = await runCommand("/usr/sbin/lsof", LSOF_ARGS, {
      timeout: LSOF_TIMEOUT,
      killProcessGroup: true,
    });

    return Process.parseLsof(stdout);
  }

  private static async loadFromNetstat() {
    const { stdout } = await runCommand("/usr/sbin/netstat", NETSTAT_ARGS, {
      timeout: NETSTAT_TIMEOUT,
      killProcessGroup: true,
    });

    return Process.parseNetstat(stdout);
  }

  private static async loadCurrent() {
    let processes: ProcessInfo[] = [];

    try {
      processes = await Process.loadFromNetstat();
    } catch {
      processes = [];
    }

    if (processes.length === 0) {
      processes = await Process.loadFromLsof();
    }

    const processDetails = await Process.getProcessDetails(processes.map((process) => process.pid));
    const processAndParentDetails = await Process.getProcessDetails(
      Array.from(processDetails.values()).flatMap((process) =>
        process.parentPid === undefined ? [] : [process.parentPid]
      )
    );

    for (const [pid, details] of processDetails) {
      processAndParentDetails.set(pid, details);
    }

    return processes.map((values) => {
      const details = processAndParentDetails.get(values.pid);
      const process = new Process(
        values.pid,
        values.name ?? details?.name,
        values.parentPid ?? details?.parentPid,
        values.user ?? details?.user,
        values.uid ?? details?.uid,
        values.protocol,
        values.portInfo,
        values.internetProtocol
      );

      process.path = values.path ?? details?.path;
      process.parentPath =
        values.parentPath ?? details?.parentPath ?? processAndParentDetails.get(process.parentPid ?? 0)?.path;

      return process;
    });
  }

  public static async getCurrent() {
    if (currentProcessesRequest === undefined) {
      currentProcessesRequest = Process.loadCurrent().finally(() => {
        currentProcessesRequest = undefined;
      });
    }

    return currentProcessesRequest;
  }
}
