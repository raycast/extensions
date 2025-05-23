import { exec } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";

/**
 * Interface for the result of code execution.
 */
export interface CodeExecutionResult {
  stdout: string;
  stderr: string;
  error: string | null;
  command: string | null; // The command that was executed
}

/**
 * Represents a detected language with its name, value, and executable path.
 */
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
async function findExecutable(command: string): Promise<string | null> {
  const defaultShellPath = process.env.SHELL || "/bin/zsh";
  const commandToExecute = `${defaultShellPath} -l -c "which ${command}"`;

  return new Promise<string | null>((resolve) => {
    exec(commandToExecute, { shell: defaultShellPath }, (error, stdout, stderr) => {
      if (error || stderr) {
        // console.warn(`[Language Detection] Could not find ${command}: ${error?.message || stderr}`); // Keep warnings subtle
        resolve(null);
      } else {
        resolve(stdout.trim());
      }
    });
  });
}

/**
 * Detects which programming languages are installed and available on the system.
 * This function checks for common executables for each supported language.
 * @returns A promise that resolves with an array of detected languages.
 */
export async function detectInstalledLanguages(): Promise<DetectedLanguage[]> {
  const detected: DetectedLanguage[] = [];

  const languageChecks = [
    { name: "JavaScript", value: "javascript", command: "node" },
    { name: "Python", value: "python", command: "python3" },
    { name: "Go", value: "go", command: "go" },
  ];

  for (const lang of languageChecks) {
    const executablePath = await findExecutable(lang.command);
    if (executablePath) {
      detected.push({
        name: lang.name,
        value: lang.value,
        executablePath: executablePath,
      });
    }
  }
  console.log("[Language Detection] Detected languages:", detected);
  return detected;
}

/**
 * Runs code in a specified language using local executables.
 * This function saves the code to a temporary file, executes it using the appropriate
 * language runtime/compiler, captures its output, and then cleans up the temporary files.
 *
 * @param {string} language The programming language (e.g., 'javascript', 'python', 'go').
 * @param {string} code The source code to execute.
 * @returns {Promise<CodeExecutionResult>} A promise that resolves with the stdout, stderr, and any execution error.
 */
export async function runCode(language: string, code: string): Promise<CodeExecutionResult> {
  const tempDir = path.join(__dirname, "..", "..", "temp");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const uniqueId = uuidv4();

  let filePath: string;
  let rawCommand: string;
  const cleanupFiles: string[] = [];
  let executableCommand: string;

  switch (language.toLowerCase()) {
    case "javascript": {
      // Added block scope
      filePath = path.join(tempDir, `${uniqueId}.js`);
      rawCommand = `node ${filePath}`;
      cleanupFiles.push(filePath);
      executableCommand = "node";
      break;
    }
    case "python": {
      // Added block scope
      filePath = path.join(tempDir, `${uniqueId}.py`);
      rawCommand = `python3 ${filePath}`;
      cleanupFiles.push(filePath);
      executableCommand = "python3";
      break;
    }
    case "go": {
      // Added block scope
      filePath = path.join(tempDir, `${uniqueId}.go`);
      const goExecPath = path.join(tempDir, uniqueId);
      rawCommand = `go build -o ${goExecPath} ${filePath} && ${goExecPath}`;
      cleanupFiles.push(filePath, goExecPath);
      executableCommand = "go";
      break;
    }
    default:
      return { stdout: "", stderr: "", error: `Unsupported language: ${language}`, command: null };
  }

  try {
    fs.writeFileSync(filePath, code);

    const defaultShellPath = process.env.SHELL || "/bin/zsh";

    // Escape quotes in rawCommand to prevent issues when nested inside a shell command
    const escapedRawCommand = rawCommand.replace(/"/g, '\\"');
    const commandToExecute = `${defaultShellPath} -l -c "${escapedRawCommand}"`;

    console.log(`[CodeRunner Debug] Using shell: ${defaultShellPath}`);
    console.log(`[CodeRunner Debug] Command to execute: ${commandToExecute}`);

    const { stdout, stderr } = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
      // Specified Promise type
      exec(
        commandToExecute,
        { cwd: tempDir, timeout: 5000, killSignal: "SIGTERM", shell: defaultShellPath },
        (error, stdout, stderr) => {
          if (error) {
            let errorMessage = error.message;
            if (error.message.includes("command not found")) {
              errorMessage = `Error: '${executableCommand}' command not found. Please ensure '${executableCommand}' is installed and accessible in your system's PATH.
                        \nIf it is installed, try running 'which ${executableCommand}' in your terminal to find its path.
                        \nThen, consider adding its directory to your shell's PATH (e.g., in ~/.zshrc or ~/.bashrc) and restarting Raycast.`;
            } else if (error.killed && error.signal === "SIGTERM") {
              errorMessage = `Code execution timed out after 5 seconds. This could be due to an infinite loop or a long-running process.`;
            }
            // Reject with a structured object for better error handling upstream
            reject({ stdout, stderr, error: errorMessage, command: commandToExecute });
          } else {
            resolve({ stdout, stderr });
          }
        },
      );
    });

    return { stdout, stderr, error: null, command: commandToExecute };
  } catch (e: unknown) {
    // Changed 'any' to 'unknown'
    const errorObject = e as {
      stdout?: string;
      stderr?: string;
      error?: string;
      message?: string;
      command?: string | null;
    }; // Type assertion for common properties
    const errorMessage = errorObject.error || errorObject.message || "Unknown error during execution";
    return {
      stdout: errorObject.stdout || "",
      stderr: errorObject.stderr || "",
      error: errorMessage,
      command: errorObject.command || null,
    };
  } finally {
    cleanupFiles.forEach((file) => {
      if (fs.existsSync(file)) {
        try {
          fs.unlinkSync(file);
        } catch (cleanupError: unknown) {
          const errorMessage = cleanupError instanceof Error ? cleanupError.message : String(cleanupError);
          console.error(`Error cleaning up file ${file}: ${errorMessage}`);
        }
      }
    });
    try {
      if (fs.readdirSync(tempDir).length === 0) {
        fs.rmdirSync(tempDir);
      }
    } catch (_dirCleanupError: unknown) {
      console.error(_dirCleanupError);
    }
  }
}
