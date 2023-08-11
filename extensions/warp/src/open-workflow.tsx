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
import os from "os";
import path from "path";
import { useMemo, useState } from "react";

const WARP_DB = path.resolve(os.homedir(), "Library/Application Support/dev.warp.Warp-Stable/warp.sqlite");
const WORKFLOW_QUERY = `SELECT id, data FROM workflows`;

const EXTENSION_URI = "raycast://extensions/warpdotdev/warp";

interface Workflow {
  id: number;
  name: string;
  description: string | null;
  command: string;
  arguments: WorkflowArgument[];
}

interface WorkflowArgument {
  name: string;
  description: string | null;
  default_value: string | null;
}

export default function Command(props: LaunchProps<{ launchContext?: { id: number } }>) {
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

  const showError = async (title: string, message: string) => {
    await showToast({
      style: Toast.Style.Failure,
      title,
      message,
    });
  };

  if (error) {
    showError("Unknown Error: ", error.message);
  }

  if (props.launchContext?.id) {
    const workflow = allWorkflows.find((w) => w.id === props.launchContext?.id);
    if (workflow) {
      return <WorkflowForm searchResult={workflow} />;
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
        description="Please see here on how to create a workflow https://docs.warp.dev/features/warp-drive/workflows."
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
  const link = `${EXTENSION_URI}/run-workflow?launchContext=${encodeURIComponent(
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
          <Action title="Push" onAction={() => push(<WorkflowForm searchResult={searchResult} />)} />
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

const getMarkers = (workflow: Workflow) => {
  const command = workflow.command;
  const markers = workflow.arguments.flatMap((arg) => {
    const matches = [...command.matchAll(new RegExp(`{{${arg.name}}}`, "g"))];
    return matches.map((m) => ({ index: m.index!, variable: arg.name }));
  });

  return markers.sort((a, b) => a.index - b.index);
};

function WorkflowForm({ searchResult }: { searchResult: Workflow }) {
  const [values, setValues] = useState<{ [key: string]: string }>(() => {
    const vals = {} as Record<string, string>;
    for (const arg of searchResult.arguments) {
      if (arg.default_value) {
        vals[arg.name] = arg.default_value;
      }
    }
    return vals;
  });

  const markers = useMemo(() => getMarkers(searchResult), [searchResult]);

  const reactiveCommand =
    markers.length > 0
      ? markers.reduce((text, marker, i) => {
          const { index, variable } = marker;
          const value = values[variable] || `{{${variable}}}`;
          const after = searchResult.command.slice(index + variable.length + 4, markers[i + 1]?.index);
          return text + value + after;
        }, searchResult.command.slice(0, markers[0].index))
      : searchResult.command;

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
          </ActionPanel>
        }
      >
        <Form.Description title={searchResult.name} text={searchResult.description ?? ""} />
        {searchResult.arguments.map((arg) => (
          <Form.TextField
            id={arg.name}
            title={arg.name}
            key={arg.name}
            value={values[arg.name] ?? ""}
            onChange={(value) => setValues({ ...values, [arg.name]: value })}
            info={arg.description ?? undefined}
          />
        ))}
        <Form.Description title={"Result"} text={reactiveCommand} />
      </Form>
    </>
  );
}
