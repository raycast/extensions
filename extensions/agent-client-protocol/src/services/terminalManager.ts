/**
 * Terminal Manager Service
 *
 * Manages terminal processes spawned by the ACP agent.
 * Tracks output, exit status, and provides lifecycle management.
 */

import { spawn, ChildProcess } from "child_process";
import { createLogger } from "@/utils/logging";

const logger = createLogger("TerminalManager");

interface TerminalInfo {
  terminalId: string;
  sessionId: string;
  process: ChildProcess;
  command: string;
  args?: string[];
  output: string;
  outputByteLimit?: number;
  exitCode: number | null;
  signal: string | null;
  hasExited: boolean;
  exitPromise: Promise<{ exitCode: number | null; signal: string | null }>;
  createdAt: Date;
}

export class TerminalManager {
  private static terminals = new Map<string, TerminalInfo>();
  private static terminalIdCounter = 0;

  /**
   * Create a new terminal and execute a command
   */
  static createTerminal(params: {
    sessionId: string;
    command: string;
    args?: string[];
    env?: Array<{ name: string; value: string }>;
    cwd?: string;
    outputByteLimit?: number;
  }): { terminalId: string } {
    const terminalId = `term_${Date.now()}_${++this.terminalIdCounter}`;

    logger.info("Creating terminal", {
      terminalId,
      sessionId: params.sessionId,
      command: params.command,
      args: params.args,
      cwd: params.cwd,
      env: params.env,
    });

    // Build environment variables
    const env = { ...process.env };
    if (params.env) {
      for (const envVar of params.env) {
        env[envVar.name] = envVar.value;
      }
    }

    logger.debug("Spawn environment", {
      terminalId,
      PATH: env.PATH,
      SHELL: env.SHELL,
      envKeys: Object.keys(env),
    });

    // Spawn the process using shell if no args provided (likely a shell command string)
    const useShell = !params.args || params.args.length === 0;
    const spawnOptions: import("child_process").SpawnOptions = {
      cwd: params.cwd || process.cwd(),
      env,
      stdio: ["ignore", "pipe", "pipe"],
      shell: useShell,
    };

    logger.debug("Spawning process", {
      terminalId,
      command: params.command,
      args: params.args,
      useShell,
      spawnOptions: {
        cwd: spawnOptions.cwd,
        shell: spawnOptions.shell,
      },
    });

    const childProcess = spawn(params.command, params.args || [], spawnOptions);

    if (!childProcess.stdout || !childProcess.stderr) {
      throw new Error("Failed to create terminal process streams");
    }

    let output = "";
    let hasExited = false;
    let exitCode: number | null = null;
    let signal: string | null = null;
    const outputByteLimit = params.outputByteLimit;

    // Create exit promise
    const exitPromise = new Promise<{ exitCode: number | null; signal: string | null }>((resolve) => {
      childProcess.on("exit", (code: number | null, sig: string | null) => {
        hasExited = true;
        exitCode = code;
        signal = sig;

        logger.info("Terminal process exited", {
          terminalId,
          exitCode: code,
          signal: sig,
          outputLength: output.length,
        });

        resolve({ exitCode: code, signal: sig });
      });
    });

    // Helper to truncate output from the beginning
    const truncateOutput = (newOutput: string) => {
      if (outputByteLimit && Buffer.byteLength(newOutput, "utf-8") > outputByteLimit) {
        // Truncate from beginning, ensuring we stay within byte limit
        let bytes = Buffer.from(newOutput, "utf-8");
        if (bytes.length > outputByteLimit) {
          // Keep only the last outputByteLimit bytes
          bytes = bytes.slice(bytes.length - outputByteLimit);

          // Find the first valid UTF-8 character boundary
          let startIndex = 0;
          while (startIndex < bytes.length) {
            try {
              const testStr = bytes.slice(startIndex).toString("utf-8");
              // If no error thrown, we found a valid boundary
              return testStr;
            } catch {
              startIndex++;
            }
          }
          return bytes.slice(startIndex).toString("utf-8");
        }
        return newOutput;
      }
      return newOutput;
    };

    // Capture stdout
    childProcess.stdout.on("data", (data: Buffer) => {
      output += data.toString();
      output = truncateOutput(output);
    });

    // Capture stderr
    childProcess.stderr.on("data", (data: Buffer) => {
      output += data.toString();
      output = truncateOutput(output);
    });

    // Handle process errors
    childProcess.on("error", (error: Error) => {
      logger.error("Terminal process error", {
        terminalId,
        command: params.command,
        args: params.args,
        cwd: spawnOptions.cwd,
        useShell: useShell,
        error: error.message,
        errorCode: (error as NodeJS.ErrnoException).code,
        errorStack: error.stack,
        PATH: env.PATH,
      });
      output += `\nProcess error: ${error.message}\n`;
      output = truncateOutput(output);
    });

    // Create terminal info object with getter for dynamic output
    const terminalInfo: TerminalInfo = {
      terminalId,
      sessionId: params.sessionId,
      process: childProcess,
      command: params.command,
      args: params.args,
      get output() {
        return output;
      },
      outputByteLimit,
      get exitCode() {
        return exitCode;
      },
      get signal() {
        return signal;
      },
      get hasExited() {
        return hasExited;
      },
      exitPromise,
      createdAt: new Date(),
    };

    this.terminals.set(terminalId, terminalInfo);

    logger.info("Terminal created successfully", { terminalId, pid: childProcess.pid });

    return { terminalId };
  }

  /**
   * Get the current output and status of a terminal
   */
  static getTerminalOutput(params: { sessionId: string; terminalId: string }): {
    output: string;
    truncated: boolean;
    exitStatus?: { exitCode: number | null; signal: string | null } | null;
  } {
    const terminal = this.terminals.get(params.terminalId);

    if (!terminal) {
      throw new Error(`Terminal not found: ${params.terminalId}`);
    }

    if (terminal.sessionId !== params.sessionId) {
      throw new Error(`Terminal ${params.terminalId} does not belong to session ${params.sessionId}`);
    }

    const wasTruncated =
      terminal.outputByteLimit !== undefined && Buffer.byteLength(terminal.output, "utf-8") >= terminal.outputByteLimit;

    return {
      output: terminal.output,
      truncated: wasTruncated,
      exitStatus: terminal.hasExited ? { exitCode: terminal.exitCode, signal: terminal.signal } : null,
    };
  }

  /**
   * Wait for a terminal to exit
   */
  static async waitForTerminalExit(params: {
    sessionId: string;
    terminalId: string;
  }): Promise<{ exitCode: number | null; signal: string | null }> {
    const terminal = this.terminals.get(params.terminalId);

    if (!terminal) {
      throw new Error(`Terminal not found: ${params.terminalId}`);
    }

    if (terminal.sessionId !== params.sessionId) {
      throw new Error(`Terminal ${params.terminalId} does not belong to session ${params.sessionId}`);
    }

    logger.info("Waiting for terminal to exit", { terminalId: params.terminalId });

    return await terminal.exitPromise;
  }

  /**
   * Kill a terminal command without releasing it
   */
  static killTerminal(params: { sessionId: string; terminalId: string }): void {
    const terminal = this.terminals.get(params.terminalId);

    if (!terminal) {
      throw new Error(`Terminal not found: ${params.terminalId}`);
    }

    if (terminal.sessionId !== params.sessionId) {
      throw new Error(`Terminal ${params.terminalId} does not belong to session ${params.sessionId}`);
    }

    if (!terminal.hasExited) {
      logger.info("Killing terminal process", {
        terminalId: params.terminalId,
        pid: terminal.process.pid,
      });
      terminal.process.kill();
    } else {
      logger.info("Terminal already exited", { terminalId: params.terminalId });
    }
  }

  /**
   * Release a terminal and free its resources
   */
  static releaseTerminal(params: { sessionId: string; terminalId: string }): void {
    const terminal = this.terminals.get(params.terminalId);

    if (!terminal) {
      throw new Error(`Terminal not found: ${params.terminalId}`);
    }

    if (terminal.sessionId !== params.sessionId) {
      throw new Error(`Terminal ${params.terminalId} does not belong to session ${params.sessionId}`);
    }

    logger.info("Releasing terminal", {
      terminalId: params.terminalId,
      hasExited: terminal.hasExited,
    });

    // Kill the process if still running
    if (!terminal.hasExited) {
      terminal.process.kill();
    }

    // Remove from tracking
    this.terminals.delete(params.terminalId);

    logger.info("Terminal released", { terminalId: params.terminalId });
  }

  /**
   * Clean up terminals for a specific session
   */
  static cleanupSession(sessionId: string): void {
    logger.info("Cleaning up terminals for session", { sessionId });

    const terminalsToRelease: string[] = [];

    for (const [terminalId, terminal] of this.terminals.entries()) {
      if (terminal.sessionId === sessionId) {
        terminalsToRelease.push(terminalId);
      }
    }

    for (const terminalId of terminalsToRelease) {
      try {
        this.releaseTerminal({ sessionId, terminalId });
      } catch (error) {
        logger.error("Failed to release terminal during cleanup", {
          terminalId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    logger.info("Session cleanup complete", {
      sessionId,
      terminalsReleased: terminalsToRelease.length,
    });
  }

  /**
   * Get all active terminals (for debugging)
   */
  static getActiveTerminals(): Array<{
    terminalId: string;
    sessionId: string;
    command: string;
    hasExited: boolean;
  }> {
    return Array.from(this.terminals.values()).map((t) => ({
      terminalId: t.terminalId,
      sessionId: t.sessionId,
      command: t.command,
      hasExited: t.hasExited,
    }));
  }
}
