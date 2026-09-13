import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  getPreferenceValues,
  openExtensionPreferences,
  useNavigation,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { fetchRunnableDefinition, installCommand, type Agent } from "./registry";
import {
  DEFAULT_MODELS,
  PROVIDER_LABELS,
  RUN_TIMEOUT_MS,
  isProvider,
  runPortableAgent,
  safeErrorMessage,
  type Provider,
} from "./runtime";

type RunFormValues = {
  task: string;
  provider: Provider;
  model: string;
};

type ExecutionState =
  | { status: "running" }
  | {
      status: "done";
      content: string;
      durationMs: number;
      steps: number;
    }
  | { status: "error"; message: string };

function RunResult({ agent, values }: { agent: Agent; values: RunFormValues }) {
  const preferences = getPreferenceValues<Preferences>();
  const [state, setState] = useState<ExecutionState>({ status: "running" });
  const controllerRef = useRef<AbortController | undefined>(undefined);
  const { pop } = useNavigation();

  function cancelRun() {
    controllerRef.current?.abort();
    setState({ status: "error", message: "Run cancelled. Your provider stream was stopped." });
  }

  useEffect(() => {
    const controller = new AbortController();
    controllerRef.current = controller;
    const timeout = setTimeout(() => {
      controller.abort();
      setState({
        status: "error",
        message: `The run exceeded ${RUN_TIMEOUT_MS / 1000} seconds and was stopped. Try a faster model or a shorter task.`,
      });
    }, RUN_TIMEOUT_MS);

    async function execute() {
      try {
        const definition = await fetchRunnableDefinition(agent.id, controller.signal);
        const result = await runPortableAgent(
          definition,
          values.task,
          {
            provider: values.provider,
            model: values.model,
            preferences,
          },
          controller.signal,
        );

        if (!controller.signal.aborted) {
          clearTimeout(timeout);
          setState({
            status: "done",
            content: result.content,
            durationMs: result.durationMs,
            steps: result.steps,
          });
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          clearTimeout(timeout);
          const message = safeErrorMessage(error, [preferences.openrouterApiKey, preferences.geminiApiKey]);
          void showFailureToast(error, { title: "Could not run agent", message });
          setState({
            status: "error",
            message,
          });
        }
      }
    }

    void execute();
    return () => {
      clearTimeout(timeout);
      controller.abort();
      controllerRef.current = undefined;
    };
  }, [
    agent.id,
    preferences.geminiApiKey,
    preferences.ollamaBaseUrl,
    preferences.openrouterApiKey,
    values.task,
    values.provider,
    values.model,
  ]);

  if (state.status === "running") {
    return (
      <Detail
        isLoading
        markdown={`# Running ${agent.title}\n\nPortable Runtime · ${PROVIDER_LABELS[values.provider]} · ${values.model}\n\nThe run will stop automatically after ${RUN_TIMEOUT_MS / 1000} seconds.`}
        actions={
          <ActionPanel>
            <Action title="Cancel Run" icon={Icon.Stop} onAction={cancelRun} />
          </ActionPanel>
        }
      />
    );
  }

  if (state.status === "error") {
    return (
      <Detail
        markdown={`# Could Not Run ${agent.title}\n\n${state.message}`}
        actions={
          <ActionPanel>
            <Action title="Return to Task" icon={Icon.ArrowLeft} onAction={pop} />
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            {agent.installable ? (
              <Action.CopyToClipboard
                title="Copy Full Agent Install Command"
                content={installCommand(agent)}
                icon={Icon.Terminal}
              />
            ) : null}
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Detail
      markdown={state.content || "_The provider returned no text._"}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Agent" text={agent.title} />
          <Detail.Metadata.Label title="Mode" text="Portable Runtime" />
          <Detail.Metadata.Label title="Provider" text={PROVIDER_LABELS[values.provider]} />
          <Detail.Metadata.Label title="Model" text={values.model} />
          <Detail.Metadata.Label title="Duration" text={`${(state.durationMs / 1000).toFixed(1)}s`} />
          <Detail.Metadata.Label title="Steps" text={String(state.steps)} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Result" content={state.content} />
          <Action title="Edit Task and Run Again" icon={Icon.ArrowLeft} onAction={pop} />
          {agent.installable ? (
            <Action.CopyToClipboard
              title="Copy Full Agent Install Command"
              content={installCommand(agent)}
              icon={Icon.Terminal}
            />
          ) : null}
        </ActionPanel>
      }
    />
  );
}

export function RunAgent({ agent }: { agent: Agent }) {
  const preferences = getPreferenceValues<Preferences>();
  const preferredProvider: Provider = isProvider(preferences.defaultProvider)
    ? preferences.defaultProvider
    : "openrouter";
  const [provider, setProvider] = useState<Provider>(preferredProvider);
  const [model, setModel] = useState(DEFAULT_MODELS[preferredProvider]);
  const { push } = useNavigation();

  function changeProvider(value: string) {
    if (!isProvider(value)) return;
    setProvider(value);
    setModel(DEFAULT_MODELS[value]);
  }

  function submit(values: RunFormValues) {
    push(<RunResult agent={agent} values={values} />);
  }

  return (
    <Form
      navigationTitle={`Run ${agent.title}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run Agent" icon={Icon.Play} onSubmit={submit} />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    >
      <Form.Description
        title={agent.title}
        text="Portable Runtime runs the agent's instruction layer with your provider. Source-defined tools are never evaluated or executed. Install the full agent when you need its complete toolchain."
      />
      <Form.TextArea id="task" title="Task" placeholder="Describe what you want this agent to do" autoFocus />
      <Form.Separator />
      <Form.Dropdown id="provider" title="Provider" value={provider} onChange={changeProvider}>
        <Form.Dropdown.Item value="openrouter" title="OpenRouter" />
        <Form.Dropdown.Item value="gemini" title="Gemini" />
        <Form.Dropdown.Item value="ollama" title="Ollama" />
      </Form.Dropdown>
      <Form.TextField
        id="model"
        title="Model"
        placeholder={DEFAULT_MODELS[provider]}
        value={model}
        onChange={setModel}
      />
    </Form>
  );
}
