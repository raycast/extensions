/**
 * Shared Code Execution Logic
 * Task 16.6: Migrated from daytona.ts for reuse across commands
 */

import { getDaytonaClient } from "./daytona-client";
import { handleDaytonaError } from "./error-handler";
import { StructuredPythonError } from "./enhanced-error-types";
import { parseStderrEnhanced } from "./stderr-parser";

// Re-export existing interfaces for backward compatibility
export interface CodeExecutionResponse {
  stdout: string;
  stderr: string;
  exitCode: number;
  error?: ExecutionError;
  enhancedError?: StructuredPythonError; // Task 8.2: Enhanced error parsing
}

export interface ExecutionError {
  type: "SyntaxError" | "RuntimeError" | "TimeoutError" | "SystemError" | "UnknownError";
  message: string;
  details: string;
  exitCode?: number;
  line?: number;
}

// Error pattern catalog (from daytona.ts)
const ERROR_PATTERNS = {
  SYNTAX_ERROR: [/SyntaxError:/, /invalid syntax/, /unexpected EOF while parsing/, /IndentationError:/, /TabError:/],
  RUNTIME_ERROR: [
    /NameError:/,
    /TypeError:/,
    /ValueError:/,
    /ZeroDivisionError:/,
    /ImportError:/,
    /ModuleNotFoundError:/,
    /AttributeError:/,
    /KeyError:/,
    /IndexError:/,
    /FileNotFoundError:/,
  ],
  SYSTEM_ERROR: [/MemoryError:/, /RecursionError:/, /SystemExit:/, /KeyboardInterrupt:/],
} as const;

// Define sandbox type interface
interface SandboxInstance {
  id: string;
  delete: () => Promise<void>;
  process: {
    codeRun: (code: string) => Promise<ExecutionResult>;
  };
}

// Define raw execution result from Daytona
interface ExecutionResult {
  result?: string;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  exit_code?: number;
  artifacts?: {
    stdout?: string;
    result?: string;
  };
}

// Sandbox registry for tracking active sandboxes
const sandboxRegistry = new Map<string, SandboxInstance>();

/**
 * Create execution error from stderr content
 */
function createExecutionError(stderr: string, exitCode: number): ExecutionError {
  const lineMatch = stderr.match(/line (\d+)/);
  const line = lineMatch ? parseInt(lineMatch[1]) : undefined;

  let type: ExecutionError["type"] = "UnknownError";
  let message = "An unexpected error occurred during code execution.";

  if (ERROR_PATTERNS.SYNTAX_ERROR.some((pattern) => pattern.test(stderr))) {
    type = "SyntaxError";
    if (stderr.includes("SyntaxError:")) {
      const syntaxMatch = stderr.match(/SyntaxError: (.+)/);
      message = syntaxMatch ? `Syntax Error: ${syntaxMatch[1]}` : "Invalid Python syntax detected.";
    } else if (stderr.includes("IndentationError:")) {
      message = "Indentation Error: Check your code indentation.";
    } else {
      message = "Syntax Error: There is an error in your Python code syntax.";
    }
  } else if (ERROR_PATTERNS.RUNTIME_ERROR.some((pattern) => pattern.test(stderr))) {
    type = "RuntimeError";

    if (stderr.includes("NameError:")) {
      const nameMatch = stderr.match(/NameError: (.+)/);
      message = nameMatch ? `Name Error: ${nameMatch[1]}` : "Name Error: Variable or function not defined.";
    } else if (stderr.includes("TypeError:")) {
      const typeMatch = stderr.match(/TypeError: (.+)/);
      message = typeMatch ? `Type Error: ${typeMatch[1]}` : "Type Error: Incorrect data type used.";
    } else if (stderr.includes("ZeroDivisionError:")) {
      message = "Division Error: Cannot divide by zero.";
    } else if (stderr.includes("ImportError:") || stderr.includes("ModuleNotFoundError:")) {
      const importMatch = stderr.match(/(?:ImportError|ModuleNotFoundError): (.+)/);
      message = importMatch ? `Import Error: ${importMatch[1]}` : "Import Error: Module not found.";
    } else {
      const errorMatch = stderr.match(/(\w+Error): (.+)/);
      message = errorMatch
        ? `${errorMatch[1]}: ${errorMatch[2]}`
        : "Runtime Error: An error occurred during execution.";
    }
  } else if (ERROR_PATTERNS.SYSTEM_ERROR.some((pattern) => pattern.test(stderr))) {
    type = "SystemError";
    message = "System Error: The code execution encountered a system-level error.";
  } else if (exitCode !== 0) {
    type = "SystemError";
    message = `Execution failed with exit code ${exitCode}.`;
  }

  return {
    type,
    message,
    details: stderr,
    exitCode,
    line,
  };
}

/**
 * Timeout wrapper for promises
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("EXECUTION_TIMEOUT")), timeoutMs)),
  ]);
}

/**
 * Create a new Daytona sandbox
 */
export async function createSandbox(timeoutMs?: number): Promise<string> {
  try {
    const daytona = getDaytonaClient();
    const sandbox = await daytona.create(
      {
        language: "python",
      },
      {
        timeout: timeoutMs ? Math.ceil(timeoutMs / 1000) : undefined,
      },
    );

    sandboxRegistry.set(sandbox.id, sandbox);
    console.log(`✅ Created sandbox: ${sandbox.id}`);
    return sandbox.id;
  } catch (error) {
    await handleDaytonaError(error, "sandbox creation");
    throw new Error(`Failed to create sandbox: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Execute Python code in a sandbox
 */
async function executePythonCode(
  sandbox: SandboxInstance,
  code: string,
  timeoutMs: number = 30000,
): Promise<ExecutionResult> {
  if (!code || typeof code !== "string") {
    throw new Error("Code parameter is required and must be a string");
  }

  // Enhanced expression auto-print logic
  const lines = code.trim().split("\n");
  const lastLine = lines[lines.length - 1].trim();

  if (
    lastLine &&
    !lastLine.startsWith("print") &&
    !lastLine.startsWith("#") &&
    !lastLine.includes("=") &&
    !lastLine.startsWith("if ") &&
    !lastLine.startsWith("for ") &&
    !lastLine.startsWith("while ") &&
    !lastLine.startsWith("def ") &&
    !lastLine.startsWith("class ") &&
    !lastLine.startsWith("import ") &&
    !lastLine.startsWith("from ") &&
    !lastLine.includes("(") &&
    !lastLine.includes("[") &&
    !lastLine.includes("{") &&
    lines.length <= 3 &&
    lastLine !== ""
  ) {
    const wrappedCode = code + "\nprint(" + lastLine + ")";

    try {
      return await withTimeout(sandbox.process.codeRun(wrappedCode), timeoutMs);
    } catch (error) {
      if (error instanceof Error && error.message === "EXECUTION_TIMEOUT") {
        throw error;
      }
      return await withTimeout(sandbox.process.codeRun(code), timeoutMs);
    }
  }

  return await withTimeout(sandbox.process.codeRun(code), timeoutMs);
}

/**
 * Map raw Daytona result to CodeExecutionResponse
 */
function mapToCodeExecutionResponse(rawResult: ExecutionResult): CodeExecutionResponse {
  const exitCode = rawResult.exitCode ?? rawResult.exit_code ?? 0;

  let stdout = rawResult.result ?? rawResult.stdout ?? "";

  if (!stdout && rawResult.artifacts) {
    stdout = rawResult.artifacts.stdout ?? rawResult.artifacts.result ?? "";
  }

  // Check all possible sources for error output
  let stderr = rawResult.stderr ?? "";

  // If stderr is empty but we have an error, check other fields
  if (!stderr && exitCode !== 0) {
    // Check if error info is in result field (common for Python tracebacks)
    if (rawResult.result && typeof rawResult.result === "string" && rawResult.result.includes("Traceback")) {
      stderr = rawResult.result;
    }
    // Check artifacts for error output (commented out - stderr not in interface)
    // else if (rawResult.artifacts?.stderr) {
    //   stderr = rawResult.artifacts.stderr;
    // }
    // Check if stdout contains error (some executors mix streams)
    else if (stdout && stdout.includes("Traceback")) {
      stderr = stdout;
    }
    // Fallback to generic message only if no traceback found
    else {
      stderr = `Process exited with code ${exitCode}`;
    }
  }

  const effectiveStderr = stderr;

  let error: ExecutionError | undefined;
  let enhancedError: StructuredPythonError | undefined;

  if (exitCode !== 0 || stderr) {
    error = createExecutionError(effectiveStderr, exitCode);

    // Task 8.5: Parse stderr for enhanced error reporting
    const parseResult = parseStderrEnhanced(effectiveStderr);
    if (parseResult.success) {
      enhancedError = parseResult.error;
    }
  }

  return {
    stdout,
    stderr: effectiveStderr,
    exitCode,
    error,
    enhancedError, // Task 8.5: Include structured error
  };
}

/**
 * Main execution function - creates sandbox, executes code, cleans up
 */
export async function executePythonCodeInSandbox(code: string, timeoutMs?: number): Promise<CodeExecutionResponse> {
  let sandbox: SandboxInstance | null = null;

  try {
    console.log("🚀 Creating sandbox for code execution");
    const daytona = getDaytonaClient();
    sandbox = await daytona.create(
      {
        language: "python",
      },
      {
        timeout: timeoutMs ? Math.ceil(timeoutMs / 1000) : undefined,
      },
    );

    console.log(`✅ Sandbox created with ID: ${sandbox.id}`);

    const rawResult = await executePythonCode(sandbox, code, timeoutMs);
    return mapToCodeExecutionResponse(rawResult);
  } catch (error) {
    console.error("❌ Code execution failed:", error);

    if (error instanceof Error && error.message === "EXECUTION_TIMEOUT") {
      return {
        stdout: "",
        stderr: `Execution timed out after ${(timeoutMs || 30000) / 1000} seconds`,
        exitCode: 124,
        error: {
          type: "TimeoutError",
          message: `Code execution timed out after ${(timeoutMs || 30000) / 1000} seconds. Your code may have an infinite loop or be taking too long to complete.`,
          details: `Execution timed out after ${(timeoutMs || 30000) / 1000} seconds`,
          exitCode: 124,
        },
      };
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      stdout: "",
      stderr: `Execution failed: ${errorMessage}`,
      exitCode: 1,
      error: {
        type: "SystemError",
        message: "Code execution failed due to a system error.",
        details: `Execution failed: ${errorMessage}`,
        exitCode: 1,
      },
    };
  } finally {
    if (sandbox) {
      try {
        console.log(`🧹 Cleaning up sandbox ${sandbox.id}`);
        await sandbox.delete();
        console.log(`✅ Successfully deleted sandbox ${sandbox.id}`);
      } catch (cleanupError) {
        console.error(`❌ Failed to delete sandbox ${sandbox.id}:`, cleanupError);
      }
    }
  }
}

/**
 * Execute code in an existing sandbox (for persistent sessions)
 */
export async function runCode(sandboxId: string, code: string): Promise<CodeExecutionResponse> {
  const sandbox = sandboxRegistry.get(sandboxId);
  if (!sandbox) {
    throw new Error(`Sandbox ${sandboxId} not found`);
  }

  try {
    console.log(`🚀 Executing code in sandbox: ${sandboxId}`);
    const rawResult = await executePythonCode(sandbox, code, 30000);
    console.log("✅ Execution completed, mapping response...");
    return mapToCodeExecutionResponse(rawResult);
  } catch (error) {
    console.error("❌ Code execution failed:", error);

    if (error instanceof Error && error.message === "EXECUTION_TIMEOUT") {
      return {
        stdout: "",
        stderr: "Execution timed out after 30 seconds",
        exitCode: 124,
        error: {
          type: "TimeoutError",
          message: "Code execution timed out after 30 seconds.",
          details: "Execution timed out after 30 seconds",
          exitCode: 124,
        },
      };
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      stdout: "",
      stderr: `Execution failed: ${errorMessage}`,
      exitCode: 1,
      error: {
        type: "SystemError",
        message: "Code execution failed due to a system error.",
        details: `Execution failed: ${errorMessage}`,
        exitCode: 1,
      },
    };
  }
}

/**
 * Kill/delete a sandbox
 */
export async function killSandbox(sandboxId: string): Promise<{ success: boolean }> {
  const sandbox = sandboxRegistry.get(sandboxId);
  if (!sandbox) {
    return { success: false };
  }

  try {
    await sandbox.delete();
    sandboxRegistry.delete(sandboxId);
    console.log(`✅ Successfully deleted sandbox: ${sandboxId}`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Failed to delete sandbox ${sandboxId}:`, error);
    sandboxRegistry.delete(sandboxId);
    return { success: false };
  }
}
