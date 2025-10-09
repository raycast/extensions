// Task 6: AI Tool Integration with Enhanced Daytona Execution Engine
// Task 16.6: Updated to use shared execution library
// Task 8.5: Enhanced error reporting for AI consumption
import { executePythonCodeInSandbox } from "../lib/execution";
import { formatErrorAsMarkdown } from "../lib/error-formatter";

type Input = {
  /**
   * The code to run.
   *
   * @remarks Needs to be a valid Python code for a Jupyter notebook cell.
   *
   * @example
   * ```python
   * print("Hello, world!")
   * ```
   */
  code: string;
};

export default async function tool(input: Input) {
  console.log("> AI Tool - Run code input", input);

  // Input validation for AI-generated code
  if (!input?.code || typeof input.code !== "string" || input.code.trim() === "") {
    return "Error: No code provided for execution.";
  }

  try {
    // Task 6.2: Execute code using enhanced Daytona service
    const result = await executePythonCodeInSandbox(input.code);

    // Task 6.3 & 6.4: Format response for AI consumption
    if (result.error) {
      // Task 8.5: Use enhanced error formatting for AI if available
      if (result.enhancedError) {
        return `Execution failed with detailed analysis:

${formatErrorAsMarkdown(result.enhancedError)}

Please review the error details above and fix the issues in your Python code.`;
      } else {
        // Fallback to basic error formatting
        return `Execution failed: ${result.error.message}

Error Details: ${result.error.details}
Exit Code: ${result.exitCode}

This error occurred while running your Python code. Please fix the issue and try again.`;
      }
    } else {
      // Format successful execution for AI
      const output = result.stdout.trim();
      if (output) {
        return `Execution successful! Output:

${output}`;
      } else {
        return "Execution completed successfully (no output produced).";
      }
    }
  } catch (error) {
    // Handle unexpected errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    return `System error during code execution: ${errorMessage}`;
  }
}
