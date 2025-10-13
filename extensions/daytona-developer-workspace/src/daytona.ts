import { Daytona } from "@daytonaio/sdk";
import { getPreferenceValues } from "@raycast/api";

// Task 2.1: CodeExecutionResponse Data Model
export interface CodeExecutionResponse {
  stdout: string;
  stderr: string;
  exitCode: number;
  error?: ExecutionError; // Task 4.5: Optional error field for structured error handling
}

// Task 4.1: ExecutionError Data Model
export interface ExecutionError {
  type: "SyntaxError" | "RuntimeError" | "TimeoutError" | "SystemError" | "UnknownError";
  message: string; // User-friendly error message
  details: string; // Original stderr or detailed error information
  exitCode?: number; // Original exit code for debugging
  line?: number; // Line number where error occurred (if available)
}

// Task 4.2: Daytona Error Patterns Catalog
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

// Task 4.3: Error Mapper Function
function createExecutionError(stderr: string, exitCode: number): ExecutionError {
  // Extract line number if available
  const lineMatch = stderr.match(/line (\d+)/);
  const line = lineMatch ? parseInt(lineMatch[1]) : undefined;

  // Determine error type based on stderr content
  let type: ExecutionError["type"] = "UnknownError";
  let message = "An unexpected error occurred during code execution.";

  // Check for syntax errors first
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
  }
  // Check for runtime errors
  else if (ERROR_PATTERNS.RUNTIME_ERROR.some((pattern) => pattern.test(stderr))) {
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
  }
  // Check for system errors
  else if (ERROR_PATTERNS.SYSTEM_ERROR.some((pattern) => pattern.test(stderr))) {
    type = "SystemError";
    message = "System Error: The code execution encountered a system-level error.";
  }
  // Handle non-zero exit codes without specific error patterns
  else if (exitCode !== 0) {
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

// Legacy interface for backward compatibility
interface ExecutionResult {
  results: Array<{ text?: string; png?: string; jpeg?: string; svg?: string; pdf?: string }>;
  logs: { stdout: string[]; stderr: string[] };
  error?: string;
}

let daytonaClient: Daytona | null = null;

// Define sandbox type interface for legacy compatibility
interface LegacySandboxInstance {
  id: string;
  delete: () => Promise<void>;
  process: {
    codeRun: (code: string) => Promise<LegacyExecutionResult>;
  };
}

// Define legacy execution result type
interface LegacyExecutionResult {
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

const sandboxRegistry = new Map<string, LegacySandboxInstance>();

function getDaytonaClient(): Daytona {
  if (!daytonaClient) {
    const preferences = getPreferenceValues<Preferences>();

    if (!preferences.apiKey) {
      throw new Error("Daytona API key is required. Please configure it in Raycast preferences.");
    }

    daytonaClient = new Daytona({ apiKey: preferences.apiKey });
  }
  return daytonaClient;
}

// Task 2.2: Sandbox Creation Function
async function createDaytonaSandbox(timeoutMs?: number) {
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
  return sandbox;
}

// Task 4.4: Timeout handling wrapper
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("EXECUTION_TIMEOUT")), timeoutMs)),
  ]);
}

// Task 2.3: Code Execution Wrapper with Task 4.4: Timeout Support
async function executePythonCode(
  sandbox: LegacySandboxInstance,
  code: string,
  timeoutMs: number = 30000,
): Promise<LegacyExecutionResult> {
  // Validate input code
  if (!code || typeof code !== "string") {
    throw new Error("Code parameter is required and must be a string");
  }

  // Simple approach: try to evaluate the last line as an expression to print its result
  const lines = code.trim().split("\n");
  const lastLine = lines[lines.length - 1].trim();

  // Only auto-print simple expressions (be more conservative to avoid breaking complex code)
  if (
    lastLine &&
    !lastLine.startsWith("print") &&
    !lastLine.startsWith("#") &&
    !lastLine.includes("=") && // Avoid assignments
    !lastLine.startsWith("if ") &&
    !lastLine.startsWith("for ") &&
    !lastLine.startsWith("while ") &&
    !lastLine.startsWith("def ") &&
    !lastLine.startsWith("class ") &&
    !lastLine.startsWith("import ") &&
    !lastLine.startsWith("from ") &&
    !lastLine.includes("(") && // Avoid function calls (they might have side effects)
    !lastLine.includes("[") && // Avoid complex data structures
    !lastLine.includes("{") && // Avoid dictionaries
    lines.length <= 3 && // Only for simple, short code blocks
    lastLine !== ""
  ) {
    // Check if it might be a simple expression by trying to wrap it
    const wrappedCode = code + "\nprint(" + lastLine + ")";

    try {
      return await withTimeout(sandbox.process.codeRun(wrappedCode), timeoutMs);
    } catch (error) {
      // If that fails due to timeout, propagate the timeout
      if (error instanceof Error && error.message === "EXECUTION_TIMEOUT") {
        throw error;
      }
      // Otherwise, try the original code
      return await withTimeout(sandbox.process.codeRun(code), timeoutMs);
    }
  }

  return await withTimeout(sandbox.process.codeRun(code), timeoutMs);
}

// Task 2.4: Map Raw Result to CodeExecutionResponse with Task 4.5: Error Integration
function mapToCodeExecutionResponse(rawResult: LegacyExecutionResult): CodeExecutionResponse {
  // Debug logging removed - enhanced error formatting handles display

  // Handle different possible response structures
  const exitCode = rawResult.exitCode ?? rawResult.exit_code ?? 0;

  // Try multiple sources for output
  let stdout = rawResult.result ?? rawResult.stdout ?? "";

  // Check artifacts for additional output
  if (!stdout && rawResult.artifacts) {
    stdout = rawResult.artifacts.stdout ?? rawResult.artifacts.result ?? "";
  }

  const stderr = rawResult.stderr ?? "";
  const effectiveStderr = exitCode !== 0 && !stderr ? `Process exited with code ${exitCode}` : stderr;

  // Task 4.5: Create ExecutionError if there's an error condition
  let error: ExecutionError | undefined;
  if (exitCode !== 0 || stderr) {
    error = createExecutionError(effectiveStderr, exitCode);
  }

  return {
    stdout,
    stderr: effectiveStderr,
    exitCode,
    error,
  };
}

// Task 2.5: Core Execution Engine Service with Task 3: Automatic Sandbox Cleanup + Task 4: Error Handling
export async function executePythonCodeInSandbox(code: string, timeoutMs?: number): Promise<CodeExecutionResponse> {
  let sandbox: LegacySandboxInstance | null = null;

  try {
    console.log("Creating sandbox for code execution");
    sandbox = await createDaytonaSandbox(timeoutMs);
    console.log(`Sandbox created with ID: ${sandbox.id}`);

    const rawResult = await executePythonCode(sandbox, code, timeoutMs);
    return mapToCodeExecutionResponse(rawResult);
  } catch (error) {
    console.error("Code execution failed:", error);

    // Task 4.4 & 4.5: Handle timeout errors specifically
    if (error instanceof Error && error.message === "EXECUTION_TIMEOUT") {
      return {
        stdout: "",
        stderr: `Execution timed out after ${(timeoutMs || 30000) / 1000} seconds`,
        exitCode: 124, // Standard timeout exit code
        error: {
          type: "TimeoutError",
          message: `Code execution timed out after ${(timeoutMs || 30000) / 1000} seconds. Your code may have an infinite loop or be taking too long to complete.`,
          details: `Execution timed out after ${(timeoutMs || 30000) / 1000} seconds`,
          exitCode: 124,
        },
      };
    }

    // Handle other errors
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
        console.log(`Attempting to clean up sandbox ${sandbox.id}`);
        await sandbox.delete();
        sandboxRegistry.delete(sandbox.id);
        console.log(`Successfully deleted sandbox ${sandbox.id}`);
      } catch (cleanupError) {
        console.error(`Failed to delete sandbox ${sandbox.id}:`, cleanupError);
        // Don't re-throw cleanup errors - allow original result/error to be returned
        sandboxRegistry.delete(sandbox.id); // Remove from registry even if deletion failed
      }
    }
  }
}

// Legacy API compatibility functions
export async function createSandbox(timeoutMs?: number): Promise<string> {
  try {
    const sandbox = await createDaytonaSandbox(timeoutMs);
    return sandbox.id;
  } catch (error) {
    throw new Error(`Failed to create sandbox: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function runCode(sandboxId: string, code: string): Promise<ExecutionResult> {
  const sandbox = sandboxRegistry.get(sandboxId);
  if (!sandbox) {
    throw new Error(`Sandbox ${sandboxId} not found`);
  }

  try {
    console.log("Executing code in sandbox:", sandboxId);
    const rawResult = await executePythonCode(sandbox, code, 30000); // Use 30 second timeout
    console.log("Execution completed, mapping response...");
    const response = mapToCodeExecutionResponse(rawResult);

    return {
      results: [{ text: response.stdout }],
      logs: {
        stdout: response.stdout ? [response.stdout] : [],
        stderr: response.stderr ? [response.stderr] : [],
      },
      error: response.exitCode !== 0 ? response.stderr : undefined,
    };
  } catch (error) {
    console.error("Code execution failed:", error);
    return {
      results: [{ text: "" }],
      logs: { stdout: [], stderr: [] },
      error: `Execution failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  } finally {
    // Legacy API auto-cleanup after execution
    try {
      console.log(`Attempting to clean up sandbox ${sandboxId}`);
      await sandbox.delete();
      sandboxRegistry.delete(sandboxId);
      console.log(`Successfully deleted sandbox ${sandboxId}`);
    } catch (cleanupError) {
      console.error(`Failed to delete sandbox ${sandboxId}:`, cleanupError);
      sandboxRegistry.delete(sandboxId); // Remove from registry even if deletion failed
    }
  }
}

export async function killSandbox(sandboxId: string): Promise<{ success: boolean }> {
  const sandbox = sandboxRegistry.get(sandboxId);
  if (!sandbox) {
    return { success: false };
  }

  try {
    await sandbox.delete();
    sandboxRegistry.delete(sandboxId);
    return { success: true };
  } catch (error) {
    console.error(`Failed to delete sandbox ${sandboxId}:`, error);
    sandboxRegistry.delete(sandboxId);
    return { success: false };
  }
}
