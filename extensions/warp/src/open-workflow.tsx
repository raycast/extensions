import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  LaunchProps,
  List,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { runAppleScript, useSQL } from "@raycast/utils";
import { useMemo, useState } from "react";
import {
  EXTENSION_URI,
  WARP_DB,
  WORKFLOW_QUERY,
  Workflow,
  WorkflowLaunchContext,
  executeShellCommand,
  fillWorkflowCommand,
  getWorkflowMarkers,
  showError,
} from "./workflow-util";

export default function Command(props: LaunchProps<{ launchContext?: WorkflowLaunchContext }>) {
  const [searchText, setSearchText] = useState("");
  const {
    data: table,
    permissionView,
    isLoading,
    error,
  } = useSQL<{ id: number; data: string }>(WARP_DB, WORKFLOW_QUERY);

  const allWorkflows = table?.map(({ data, id }) => ({ id, ...JSON.parse(data) } as Workflow)) ?? [];

  if (permissionView) {
    return permissionView;
  }

  if (error) {
    showError("Unknown Error: ", error.message);
  }

  if (props.launchContext?.id) {
    const workflow = allWorkflows.find((w) => w.id === props.launchContext?.id);
    if (workflow) {
      return <WorkflowForm workflow={workflow} formValues={props.launchContext.values} />;
    }
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Searching for workflows..."
      throttle
    >
      <List.EmptyView
        title="No workflows found"
        description="Please see here on how to create a workflow: https://docs.warp.dev/features/warp-drive/workflows."
      />
      <List.Section title="Results" subtitle={allWorkflows.length + ""}>
        {allWorkflows
          .filter((f) => f.name.toLowerCase().includes(searchText.toLowerCase()))
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((searchResult) => (
            <SearchListItem key={searchResult.name} searchResult={searchResult} />
          ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({ searchResult }: { searchResult: Workflow }) {
  const { push } = useNavigation();
  const link = `${EXTENSION_URI}/open-workflow?launchContext=${encodeURIComponent(
    JSON.stringify({
      id: searchResult.id,
    })
  )}`;

  return (
    <List.Item
      title={searchResult.name}
      subtitle={searchResult.description || ""}
      actions={
        <ActionPanel>
          <Action title="View" icon={Icon.Eye} onAction={() => push(<WorkflowForm workflow={searchResult} />)} />
          <Action.CreateQuicklink
            title="Create Quicklink"
            icon={Icon.Link}
            quicklink={{
              link,
            }}
          />
        </ActionPanel>
      }
    />
  );
}

function WorkflowForm({ workflow, formValues }: { workflow: Workflow; formValues?: Record<string, string> }) {
  const [values, setValues] = useState<{ [key: string]: string }>(() => {
    const vals = {} as Record<string, string>;
    for (const arg of workflow.arguments) {
      if (arg.default_value) {
        vals[arg.name] = arg.default_value;
      }
    }
    return { ...vals, ...formValues };
  });

  const variableRegex = /{{([a-zA-z_-]+)}}/g;
  const reactiveCommand = workflow.command.replaceAll(variableRegex, (_, key) => values[key] || `{{${key}}}`);

  return (
    <>
      <Form
        actions={
          <ActionPanel>
            <Action.CopyToClipboard content={reactiveCommand} title="Copy to Clipboard" icon={Icon.CopyClipboard} />
            <Action.SubmitForm
              icon={Icon.Terminal}
              title="Paste to Warp"
              onSubmit={async () => {
                await runAppleScript(`tell application "Warp" to activate`);
                await Clipboard.paste(reactiveCommand);
              }}
            />
            <Action.SubmitForm
              icon={Icon.Bolt}
              title="Run Workflow"
              onSubmit={async () => {
                const { stdout, stderr } = await executeShellCommand(reactiveCommand);
                if (stderr) {
                  showError("Error", stderr);
                }
                if (stdout) {
                  await Clipboard.copy(stdout);
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Result Copied to Clipboard ✅",
                    message: stdout,
                  });
                }
              }}
            />
          </ActionPanel>
        }
      >
        <Form.Description title={workflow.name} text={workflow.description ?? ""} />
        {workflow.arguments.map((arg) => (
          <Form.TextField
            id={arg.name}
            title={arg.name}
            key={arg.name}
            value={values[arg.name] ?? ""}
            onChange={(value) => setValues({ ...values, [arg.name]: value })}
            info={arg.description ?? undefined}
          />
        ))}
        <Form.Description title="Result" text={reactiveCommand} />
      </Form>
    </>
  );
}
