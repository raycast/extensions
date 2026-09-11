import { Form, ActionPanel, Action, showToast, Toast, Detail, useNavigation, Icon } from "@raycast/api";
import { useState } from "react";
import { queryWorkflow } from "../lib/temporal-client";

interface QueryWorkflowFormProps {
  workflowId: string;
  runId?: string;
}

export default function QueryWorkflowForm({ workflowId, runId }: QueryWorkflowFormProps) {
  const { push } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [queryType, setQueryType] = useState("");
  const [args, setArgs] = useState("");
  const [argsError, setArgsError] = useState<string | undefined>();

  const validateArgs = (value: string) => {
    if (!value.trim()) {
      setArgsError(undefined);
      return true;
    }

    try {
      JSON.parse(value);
      setArgsError(undefined);
      return true;
    } catch {
      setArgsError("Invalid JSON");
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!queryType.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Query Type Required",
        message: "Please enter a query type",
      });
      return;
    }

    if (args.trim() && !validateArgs(args)) {
      return;
    }

    setIsLoading(true);

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Querying workflow...",
      });

      let parsedArgs: unknown = undefined;
      if (args.trim()) {
        parsedArgs = JSON.parse(args);
      }

      const result = await queryWorkflow(workflowId, queryType, parsedArgs, runId);

      await showToast({
        style: Toast.Style.Success,
        title: "Query Successful",
      });

      // Show the result in a detail view
      push(<QueryResult workflowId={workflowId} queryType={queryType} result={result} />);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Query Failed",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={`Query: ${workflowId}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run Query" icon={Icon.MagnifyingGlass} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Workflow" text={workflowId} />
      {runId && <Form.Description title="Run ID" text={runId} />}

      <Form.Separator />

      <Form.TextField
        id="queryType"
        title="Query Type"
        placeholder="e.g., getStatus, getCurrentState"
        value={queryType}
        onChange={setQueryType}
        autoFocus
      />

      <Form.TextArea
        id="args"
        title="Arguments (JSON)"
        placeholder='{"key": "value"}'
        value={args}
        onChange={(value) => {
          setArgs(value);
          if (value.trim()) {
            validateArgs(value);
          } else {
            setArgsError(undefined);
          }
        }}
        error={argsError}
        info="Optional JSON arguments for the query"
      />
    </Form>
  );
}

interface QueryResultProps {
  workflowId: string;
  queryType: string;
  result: unknown;
}

function QueryResult({ workflowId, queryType, result }: QueryResultProps) {
  const resultStr = typeof result === "string" ? result : JSON.stringify(result, null, 2);

  const markdown = `# Query Result

**Workflow:** \`${workflowId}\`
**Query:** \`${queryType}\`

---

\`\`\`json
${resultStr}
\`\`\`
`;

  return (
    <Detail
      navigationTitle={`Query Result: ${queryType}`}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Result" content={resultStr} shortcut={{ modifiers: ["cmd"], key: "c" }} />
          <Action.CopyToClipboard title="Copy as JSON" content={JSON.stringify(result)} />
        </ActionPanel>
      }
    />
  );
}
