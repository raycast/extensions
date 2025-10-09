// Task 5.1 & 5.2: Refactored to use enhanced Daytona execution engine
// Task 16.6: Updated to use shared execution library and error handling
// Task 8.5: Enhanced error reporting integration
import { Detail, LaunchProps } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { executePythonCodeInSandbox } from "./lib/execution";
import { formatErrorCompact } from "./lib/error-formatter";

interface Arguments {
  code: string;
}

export default function RunCodeCommand(props: LaunchProps<{ arguments: Arguments }>) {
  const { code } = props.arguments;

  const { data, isLoading, error } = usePromise(
    async (code: string) => {
      if (!code || typeof code !== "string" || code.trim() === "") {
        throw new Error("No code provided. Please enter some Python code to execute.");
      }

      console.log("> Executing code:", code);
      const result = await executePythonCodeInSandbox(code);
      console.log("Execution completed:", { exitCode: result.exitCode, hasError: !!result.error });

      if (result.error) {
        const errorMessage = result.enhancedError ? formatErrorCompact(result.enhancedError) : result.stderr;
        throw new Error(errorMessage);
      }

      return result.stdout.trim() || "Execution completed successfully (no output produced).";
    },
    [code],
  );

  if (error) {
    const errorMarkdown = "# Execution Failed\n\n```\n" + error.message + "\n```";
    return (
      <Detail
        markdown={errorMarkdown}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label title="Status" text="Error" />
            <Detail.Metadata.Label title="Code" text={code} />
          </Detail.Metadata>
        }
      />
    );
  }

  if (isLoading) {
    return <Detail isLoading={true} markdown="# Executing Code..." />;
  }

  const resultMarkdown = "# Execution Result\n\n```\n" + data + "\n```";
  return (
    <Detail
      markdown={resultMarkdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Status" text="Success" />
          <Detail.Metadata.Label title="Code" text={code} />
        </Detail.Metadata>
      }
    />
  );
}
