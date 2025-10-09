/**
 * Enhanced Run Code Command
 * Task 15: Advanced code execution with rich features
 */

import { ActionPanel, Action, Form, Detail, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { executePythonCodeInSandbox, CodeExecutionResponse } from "./lib/execution";
import { withDaytonaErrorHandling } from "./lib/error-handler";
import { formatErrorAsMarkdown } from "./lib/error-formatter";

interface FormValues {
  code: string;
  timeout: string;
}

function ExecutionResults({ result, code }: { result: CodeExecutionResponse; code: string }) {
  const { pop } = useNavigation();

  // Debug what we're rendering
  console.log("ExecutionResults - Debug:");
  console.log("- result.enhancedError exists:", !!result.enhancedError);
  console.log("- result.error exists:", !!result.error);
  if (result.enhancedError) {
    console.log("- Enhanced error type:", result.enhancedError.errorType);
    console.log("- Formatted markdown preview:", formatErrorAsMarkdown(result.enhancedError).substring(0, 100));
  }

  const markdown = `
# Code Execution Results

## Code
\`\`\`python
${code}
\`\`\`

## Output
${result.error ? "❌ **Execution Failed**" : "✅ **Execution Successful**"}

${
  result.stdout
    ? `
### Standard Output
\`\`\`
${result.stdout}
\`\`\`
`
    : ""
}

${
  result.enhancedError
    ? `
### Error Analysis
${formatErrorAsMarkdown(result.enhancedError)}
`
    : result.error
      ? `
### Error Details
- **Type**: ${result.error.type}
- **Message**: ${result.error.message}
- **Exit Code**: ${result.exitCode}
${result.error.line ? `- **Line**: ${result.error.line}` : ""}
`
      : ""
}

---
*Executed with Daytona Code Interpreter*
  `;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Run Again" icon="▶️" onAction={pop} />
          <Action.CopyToClipboard title="Copy Output" content={result.stdout || result.stderr || "No output"} />
          {result.error && (
            <Action.CopyToClipboard
              title="Copy Error Details"
              content={`${result.error.type}: ${result.error.message}`}
            />
          )}
        </ActionPanel>
      }
    />
  );
}

function EnhancedRunCodeCommand() {
  const [isExecuting, setIsExecuting] = useState(false);
  const { push } = useNavigation();

  const executeCode = withDaytonaErrorHandling("Enhanced Run Code", async (values: FormValues) => {
    if (!values.code.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "No Code Provided",
        message: "Please enter some Python code to execute",
      });
      return;
    }

    setIsExecuting(true);
    showToast({
      style: Toast.Style.Animated,
      title: "Executing Code",
      message: "Creating sandbox and running your code...",
    });

    try {
      const timeout = values.timeout ? parseInt(values.timeout) * 1000 : 30000;
      const result = await executePythonCodeInSandbox(values.code, timeout);

      // Debug enhanced error integration
      console.log("Enhanced Code Runner - Debug:");
      console.log("- Has error:", !!result.error);
      console.log("- Has enhancedError:", !!result.enhancedError);
      console.log("- Error type:", result.enhancedError?.errorType);
      console.log("- Stderr length:", result.stderr.length);

      showToast({
        style: result.error ? Toast.Style.Failure : Toast.Style.Success,
        title: result.error ? "Execution Failed" : "Execution Complete",
        message: result.error ? result.error.message : "Code executed successfully",
      });

      push(<ExecutionResults result={result} code={values.code} />);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Execution Error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsExecuting(false);
    }
  });

  return (
    <Form
      isLoading={isExecuting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Execute Code" icon="▶️" onSubmit={executeCode} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="code"
        title="Python Code"
        placeholder="Enter your Python code here..."
        enableMarkdown={false}
      />

      <Form.TextField
        id="timeout"
        title="Timeout (seconds)"
        placeholder="30"
        info="Maximum execution time in seconds (default: 30)"
      />

      <Form.Separator />

      <Form.Description
        title="Enhanced Features"
        text="• Rich output formatting with syntax highlighting
• Detailed error reporting with line numbers
• Configurable execution timeout
• Result copying and sharing"
      />
    </Form>
  );
}

export default EnhancedRunCodeCommand;
