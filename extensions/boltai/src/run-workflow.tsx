import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  List,
  Toast,
  getSelectedText,
  showToast,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useCallback } from "react";
import { Workflow, bolt, boltJSON, showBoltFailure } from "./bolt";
import { LoadErrorView } from "./load-error";
import { ResultView } from "./result-view";

function WorkflowResult(props: { workflow: Workflow; input: string }) {
  const { workflow, input } = props;
  // The workflow's own output action doesn't apply here: the result shows in Raycast.
  const run = useCallback(
    (signal: AbortSignal, onProgress: (text: string) => void) =>
      bolt(["run", workflow.id], { input, signal, onProgress }),
    [workflow.id, input],
  );
  return <ResultView navigationTitle={workflow.name} run={run} actions={<EditWorkflowAction workflow={workflow} />} />;
}

function InputForm(props: { workflow: Workflow }) {
  const { push } = useNavigation();
  return (
    <Form
      navigationTitle={props.workflow.name}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Run Workflow"
            icon={Icon.Play}
            onSubmit={({ input }: { input: string }) => {
              if (!input.trim()) {
                showToast({ style: Toast.Style.Failure, title: "Type some input first" });
                return;
              }
              push(<WorkflowResult workflow={props.workflow} input={input} />);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea id="input" title="Input" placeholder="Text for the workflow" autoFocus />
    </Form>
  );
}

function EditWorkflowAction(props: { workflow: Workflow }) {
  return (
    <Action
      title="Edit in BoltAI"
      icon={Icon.Pencil}
      shortcut={Keyboard.Shortcut.Common.Edit}
      onAction={() => bolt(["open", "workflow", props.workflow.id]).catch(showBoltFailure)}
    />
  );
}

export default function Command() {
  const { push } = useNavigation();
  // Failures show in the list itself (LoadErrorView), not as a toast.
  const { isLoading, data, error, revalidate } = useCachedPromise(() => boltJSON<Workflow[]>(["workflows"]), [], {
    onError: () => {},
  });

  async function runOn(workflow: Workflow, read: () => Promise<string | undefined>, emptyMessage: string) {
    let input: string | undefined;
    try {
      input = await read();
    } catch {
      input = undefined;
    }
    if (!input?.trim()) {
      await showToast({ style: Toast.Style.Failure, title: emptyMessage });
      return;
    }
    push(<WorkflowResult workflow={workflow} input={input} />);
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search AI Workflows">
      {error && !isLoading ? (
        <LoadErrorView error={error} onRetry={revalidate} />
      ) : (
        <List.EmptyView
          icon={Icon.Bolt}
          title={isLoading ? "Loading workflows…" : "No AI Workflows"}
          description={isLoading ? undefined : "Create one in BoltAI › Settings › AI Workflows."}
        />
      )}
      {(error ? [] : (data ?? [])).map((workflow) => (
        <List.Item
          key={workflow.id}
          icon={workflow.kind === "multi-step" ? Icon.Layers : Icon.Bolt}
          title={workflow.name}
          subtitle={workflow.summary}
          accessories={[
            ...(workflow.kind === "multi-step" ? [{ tag: "Multi-step" }] : []),
            ...(workflow.enabled === false ? [{ text: "Disabled" }] : []),
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Run on Selected Text"
                icon={Icon.TextCursor}
                onAction={() => runOn(workflow, getSelectedText, "Select some text first")}
              />
              <Action
                title="Run on Clipboard"
                icon={Icon.Clipboard}
                shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
                onAction={() => runOn(workflow, () => Clipboard.readText(), "The clipboard has no text")}
              />
              <Action.Push
                title="Run with Typed Input"
                icon={Icon.Keyboard}
                shortcut={{ modifiers: ["cmd"], key: "t" }}
                target={<InputForm workflow={workflow} />}
              />
              <EditWorkflowAction workflow={workflow} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
