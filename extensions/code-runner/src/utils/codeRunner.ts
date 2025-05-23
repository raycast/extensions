// src/utils/codeRunner.ts
import { getPreferenceValues } from "@raycast/api";
import { exec } from "child_process";
import * as fs from "fs/promises";
import * as path from "path";
import os from "os";
import { v4 as uuidv4 } from "uuid";

interface Preferences {
  nodePath?: string;
  pythonPath?: string;
  goPath?: string;
  swiftPath?: string; // Add swiftPath to preferences
  codeExecutionTimeout: string;
}

const preferences = getPreferenceValues<Preferences>();

export interface CodeExecutionResult {
  stdout: string;
  stderr: string;
  error: string | null;
  command: string | null;
}

export interface DetectedLanguage {
  name: string;
  value: string;
  executablePath: string;
}

/**
 * Attempts to find the path of an executable command.
 * @param command The command to find (e.g., 'node', 'python3', 'go').
 * @returns A promise that resolves with the executable path or null if not found.
 */
async function checkCommand(command: string): Promise<string | null> {
  const defaultShellPath = process.env.SHELL || "/bin/zsh";
  const commandToExecute = `${defaultShellPath} -l -c "which ${command} 2>/dev/null"`;

  return new Promise<string | null>((resolve) => {
    exec(commandToExecute, { shell: defaultShellPath }, (error, stdout, stderr) => {
      const trimmedStdout = typeof stdout === "string" ? stdout.trim() : "";

      if (error || stderr || !trimmedStdout) {
        resolve(null);
      } else {
        resolve(trimmedStdout);
      }
    });
  });
}

/**
 * Helper to build language config.
 */
function buildLanguageConfig(name: string, executablePath: string): DetectedLanguage {
  return { name: name.charAt(0).toUpperCase() + name.slice(1), value: name, executablePath };
}

/**
 * Detects which programming languages are installed and available on the system.
 * This function checks for common executables for each supported language,
 * prioritizing user-defined paths from preferences.
 * @returns A promise that resolves with an array of detected languages.
 */
export async function detectInstalledLanguages(): Promise<DetectedLanguage[]> {
  const detected: DetectedLanguage[] = [];

  const customNodePath = preferences.nodePath?.trim();
  const customPythonPath = preferences.pythonPath?.trim();
  const customGoPath = preferences.goPath?.trim();
  const customSwiftPath = preferences.swiftPath?.trim(); // Get custom Swift path

  const nodePath = customNodePath && customNodePath !== "" ? customNodePath : await checkCommand("node");
  let pythonPath = customPythonPath && customPythonPath !== "" ? customPythonPath : await checkCommand("python3");
  const goPath = customGoPath && customGoPath !== "" ? customGoPath : await checkCommand("go");
  const swiftPath = customSwiftPath && customSwiftPath !== "" ? customSwiftPath : await checkCommand("swift"); // Check for swift command

  if (!pythonPath) {
    pythonPath = await checkCommand("python");
  }

  if (nodePath) detected.push(buildLanguageConfig("javascript", nodePath));
  if (pythonPath) detected.push(buildLanguageConfig("python", pythonPath));
  if (goPath) detected.push(buildLanguageConfig("go", goPath));
  if (swiftPath) detected.push(buildLanguageConfig("swift", swiftPath)); // Add Swift if detected

  return detected;
}

/**
 * Runs the given code snippet in the specified language.
 * Creates a temporary file, executes it, and cleans up.
 * @param language The language identifier (e.g., 'javascript', 'python', 'go', 'swift').
 * @param code The source code to execute.
 * @returns A promise that resolves to a CodeExecutionResult object.
 */
export async function runCode(language: string, code: string): Promise<CodeExecutionResult> {
  const detectedLanguages = await detectInstalledLanguages();
  const selectedLanguage = detectedLanguages.find((lang) => lang.value === language);

  if (!selectedLanguage) {
    return {
      stdout: "",
      stderr: "",
      error: `Unsupported language: ${language}. Please ensure it's installed and detected.`,
      command: null,
    };
  }

  let tempDir: string | undefined;
  let filePath: string | undefined;
  let command: string | null = null;
  const timeoutMs = parseInt(preferences.codeExecutionTimeout || "5000") || 5000;

  try {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "raycast-code-runner-"));

    let fileExtension = "";
    switch (selectedLanguage.value) {
      case "javascript": {
        fileExtension = "js";
        filePath = path.join(tempDir, `${uuidv4()}.${fileExtension}`);
        command = `${selectedLanguage.executablePath} "${filePath}"`;
        break;
      }
      case "python": {
        fileExtension = "py";
        filePath = path.join(tempDir, `${uuidv4()}.${fileExtension}`);
        command = `${selectedLanguage.executablePath} "${filePath}"`;
        break;
      }
      case "go": {
        fileExtension = "go";
        filePath = path.join(tempDir, `${uuidv4()}.${fileExtension}`);
        command = `${selectedLanguage.executablePath} run "${filePath}"`;
        break;
      }
      case "swift": {
        // Add Swift case
        fileExtension = "swift";
        filePath = path.join(tempDir, `${uuidv4()}.${fileExtension}`);
        command = `${selectedLanguage.executablePath} "${filePath}"`; // Swift can be run directly
        break;
      }
      default:
        return { stdout: "", stderr: "", error: `Unknown language: ${language}`, command: null };
    }

    if (filePath) {
      await fs.writeFile(filePath, code);
    } else {
      return { stdout: "", stderr: "", error: "Internal error: filePath not determined.", command: null };
    }

    const defaultShellPath = process.env.SHELL || "/bin/zsh";
    const escapedCommand = command ? command.replace(/"/g, '\\"') : "";
    const commandToExecute = `${defaultShellPath} -l -c "${escapedCommand}"`;

    const { stdout, stderr } = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
      exec(
        commandToExecute,
        { cwd: tempDir, timeout: timeoutMs, killSignal: "SIGTERM", shell: defaultShellPath },
        (error, stdout, stderr) => {
          if (error) {
            let errorMessage = error.message;
            if (error.message.includes("command not found")) {
              errorMessage = `Error: '${selectedLanguage.executablePath}' command not found. Please ensure it's installed and accessible in your system's PATH.
                        If it is installed, try running 'which ${selectedLanguage.executablePath}' in your terminal to find its path.
                        Then, consider adding its directory to your shell's PATH (e.g., in ~/.zshrc or ~/.bashrc) and restarting Raycast.`;
            } else if (error.killed && error.signal === "SIGTERM") {
              errorMessage = `Code execution timed out after ${timeoutMs / 1000} seconds.`;
            }
            reject({ stdout, stderr, error: errorMessage, command: commandToExecute });
          } else {
            resolve({ stdout, stderr });
          }
        },
      );
    });

    return { stdout: stdout.trim(), stderr: stderr.trim(), error: null, command: commandToExecute };
  } catch (e: unknown) {
    const errorObject = e as {
      stdout?: string;
      stderr?: string;
      error?: string;
      message?: string;
      command?: string | null;
    };
    const errorMessage = errorObject.error || errorObject.message || "Unknown error during execution";
    return {
      stdout: errorObject.stdout || "",
      stderr: errorObject.stderr || "",
      error: errorMessage,
      command: errorObject.command || null,
    };
  } finally {
    if (tempDir) {
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (_: unknown) {
        void _;
      }
    }
  }
}
