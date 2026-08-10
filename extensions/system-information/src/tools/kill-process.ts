import { Tool, Action } from "@raycast/api";
import { exec } from "child_process";
import si from "systeminformation";

/**
 * Input type for kill-process tool
 */
interface KillProcessInput {
  pid: string;
}

interface KillProcessResult {
  success: boolean;
  message: string;
}

/**
 * Confirmation for killing a process
 */
export const confirmation: Tool.Confirmation<{ pid: string }> = async (input) => {
  const pid = input.pid;

  try {
    const processes = await si.processes();
    const process = processes.list.find((p) => p.pid.toString() === pid.toString());

    if (!process) {
      throw new Error(`Process with PID ${pid} not found`);
    }

    return {
      style: Action.Style.Destructive,
      message: `Are you sure you want to terminate the process "${process.name}"?`,
      info: [
        { name: "Process Name", value: process.name },
        { name: "PID", value: process.pid.toString() },
        { name: "CPU Usage", value: `${process.cpu.toFixed(2)}%` },
        { name: "Memory Usage", value: `${process.mem.toFixed(2)}%` },
      ],
    };
  } catch (error) {
    throw new Error(
      `Failed to retrieve process information: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};

/**
 * Kill a process
 * @param {KillProcessInput} input
 * @returns {Promise<KillProcessResult>} Result of killing the process
 */
export default async function Command(input: KillProcessInput): Promise<KillProcessResult> {
  const pid = input.pid;

  return new Promise<KillProcessResult>((resolve, reject) => {
    exec(`kill ${pid}`, (error) => {
      if (error) {
        reject(new Error(`Failed to kill process with PID ${pid}: ${error.message}`));
        return;
      }

      resolve({
        success: true,
        message: `Process with PID ${pid} has been terminated successfully.`,
      });
    });
  });
}
