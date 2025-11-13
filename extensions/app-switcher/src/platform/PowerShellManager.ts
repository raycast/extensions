// PowerShellManager: Manages a persistent PowerShell process for command execution

import { spawn, ChildProcessWithoutNullStreams } from "child_process";

class PowerShellManager {
  private static instance: PowerShellManager | null = null;
  private psProcess: ChildProcessWithoutNullStreams | null = null;
  private pending: Array<{ resolve: (output: string) => void; reject: (err: Error) => void }> = [];
  private buffer: string = "";

  private constructor() {}

  static getInstance(): PowerShellManager {
    if (!PowerShellManager.instance) {
      PowerShellManager.instance = new PowerShellManager();
    }
    return PowerShellManager.instance;
  }

  startProcess(): void {
    if (this.psProcess) return;
    this.psProcess = spawn(
      "powershell",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", "-"],
      {
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    this.psProcess.stdout.on("data", (data) => this.handleData(data));
    this.psProcess.stderr.on("data", (data) => this.handleError(data));
    this.psProcess.on("exit", (code, signal) => {
      this.psProcess = null;
      this.buffer = "";
      // Reject all pending promises
      while (this.pending.length) {
        const pending = this.pending.shift();
        if (pending) pending.reject(new Error(`PowerShell exited: ${code} (${signal})`));
      }
    });
  }

  handleData(data: Buffer) {
    this.buffer += data.toString();
    // Handle multi-line output: resolve on newline
    if (this.buffer.endsWith("\n") || this.buffer.endsWith("\r\n")) {
      const output = this.buffer.trim();
      this.buffer = "";
      const pending = this.pending.shift();
      if (pending) pending.resolve(output);
    }
  }

  handleError(data: Buffer) {
    const error = new Error(data.toString());
    const pending = this.pending.shift();
    if (pending) pending.reject(error);
  }

  /**
   * Run a PowerShell script file or direct command.
   * If scriptPath looks like a file path, use & "file". Otherwise, treat as direct command.
   *
   * IMPORTANT: The PowerShell script MUST emit output (e.g., via Write-Output) and end with a newline.
   * The Node.js process waits for a line of output to resolve the promise. If there is no output,
   * the promise will hang or timeout. Always ensure your script calls Write-Output on every code path.
   */
  async runScript(scriptOrCommand: string, args: string[] = []): Promise<string> {
    this.startProcess();
    return new Promise((resolve, reject) => {
      this.pending.push({ resolve, reject });
      let command: string;
      // If it looks like a file path, use & "file" syntax
      if (/\.ps1$/.test(scriptOrCommand) || scriptOrCommand.includes(":\\")) {
        command = `& "${scriptOrCommand}" ${args.join(" ")}`;
      } else {
        command = scriptOrCommand + (args.length ? " " + args.join(" ") : "");
      }
      this.psProcess?.stdin.write(command + "\n");
    });
  }
}

export default PowerShellManager;
