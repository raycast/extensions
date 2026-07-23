import { Action, ActionPanel, Form, Icon, closeMainWindow, useNavigation } from "@raycast/api";
import { createDeeplink } from "@raycast/utils";
import { useEffect, useState } from "react";
import { useHerdrSnapshot } from "../hooks/use-herdr-snapshot";
import { agentIcon, agentTitle } from "../lib/agent-appearance";
import { type AgentDestination, prepareAgentPane } from "../lib/agent-launch";
import { focusResource, runHerdr, sendAgentPrompt } from "../lib/herdr";
import { parseEnvironment, parseShellWords } from "../lib/parsers";
import type { StartAgentPreset } from "../lib/start-agent-preset";
import { revealFocusedHerdr } from "../lib/terminal";
import { AGENT_KINDS, type AgentKind, type HerdrSnapshot } from "../lib/types";
import { ErrorView, runAction } from "../lib/ui";

const NAME_PATTERN = /^[a-z][a-z0-9_-]{0,31}$/;

function getDestinationTitle(destination: AgentDestination, snapshot?: HerdrSnapshot): string {
  if (destination === "new-workspace") return "New Workspace";
  if (destination === "split-right") return "Split Right";
  if (destination === "split-down") return "Split Down";
  if (destination.startsWith("tab:")) {
    const workspace = snapshot?.workspaces.find((item) => item.workspace_id === destination.slice(4));
    return `New Tab in ${workspace?.label || "Workspace"}`;
  }
  const pane = snapshot?.panes.find((item) => item.pane_id === destination.slice(5));
  return pane?.title || pane?.terminal_title_stripped || pane?.cwd || "Selected Pane";
}

export function StartAgentForm({
  initialPaneId,
  initialValues = {},
  onDone,
}: {
  initialPaneId?: string;
  initialValues?: StartAgentPreset;
  onDone?: () => void | Promise<void>;
}) {
  const snapshot = useHerdrSnapshot();
  const { pop } = useNavigation();
  const [destination, setDestination] = useState<AgentDestination>(
    initialPaneId ? `pane:${initialPaneId}` : (initialValues.destination ?? "new-workspace"),
  );
  const [name, setName] = useState(initialValues.name ?? "");
  const [kind, setKind] = useState<AgentKind>(initialValues.kind ?? "codex");
  const [cwd, setCwd] = useState<string[]>(initialValues.cwd ? [initialValues.cwd] : []);
  const [environment, setEnvironment] = useState("");
  const [argumentsText, setArgumentsText] = useState(initialValues.arguments ?? "");
  const [prompt, setPrompt] = useState(initialValues.prompt ?? "");
  const [focusAfter, setFocusAfter] = useState(initialValues.focusAfter ?? true);
  const [nameError, setNameError] = useState<string>();
  const [environmentError, setEnvironmentError] = useState<string>();
  const [argumentsError, setArgumentsError] = useState<string>();

  const data = snapshot.data;
  const panes = (data?.panes || []).filter((pane) => !pane.agent && !pane.launch_pending);
  const createsDestination = !destination.startsWith("pane:");
  const destinationTitle = getDestinationTitle(destination, data);
  const preset: StartAgentPreset = {
    kind,
    name: name.trim() || undefined,
    destination,
    cwd: createsDestination ? cwd[0] : undefined,
    arguments: argumentsText || undefined,
    prompt: prompt || undefined,
    focusAfter,
  };
  const quicklinkName = `Start ${name.trim() || agentTitle(kind)} in ${destinationTitle}`;
  const quicklink = createDeeplink({ command: "start-agent", context: preset });

  useEffect(() => {
    if (!data || destination === "new-workspace") return;
    const available = destination.startsWith("pane:")
      ? data.panes.some((pane) => pane.pane_id === destination.slice(5) && !pane.agent && !pane.launch_pending)
      : destination.startsWith("tab:")
        ? data.workspaces.some((workspace) => workspace.workspace_id === destination.slice(4))
        : Boolean(data.focused_pane_id);
    if (!available) setDestination("new-workspace");
  }, [data, destination]);

  if (snapshot.error && !snapshot.data) return <ErrorView error={snapshot.error} onRetry={snapshot.revalidate} />;

  async function submit() {
    if (!data) return;
    const agentName = name.trim() || kind;
    if (!NAME_PATTERN.test(agentName)) {
      setNameError("Use 1–32 lowercase letters, numbers, underscores, or hyphens; start with a letter.");
      return;
    }

    let environmentValues: string[];
    let extraArguments: string[];
    try {
      environmentValues = createsDestination ? parseEnvironment(environment) : [];
      setEnvironmentError(undefined);
    } catch (error) {
      setEnvironmentError(error instanceof Error ? error.message : String(error));
      return;
    }
    try {
      extraArguments = parseShellWords(argumentsText);
      setArgumentsError(undefined);
    } catch (error) {
      setArgumentsError(error instanceof Error ? error.message : String(error));
      return;
    }

    let shouldCloseRaycast = false;
    const success = await runAction(
      `Starting ${agentTitle(kind)}`,
      async () => {
        const paneId = await prepareAgentPane(destination, data, {
          name: agentName,
          cwd: createsDestination ? cwd[0] : undefined,
          environment: environmentValues,
        });
        const args = ["agent", "start", agentName, "--kind", kind, "--pane", paneId, "--timeout", "60000"];
        if (extraArguments.length) args.push("--", ...extraArguments);
        await runHerdr(args, { timeout: 70_000 });
        if (prompt.trim()) await sendAgentPrompt(agentName, prompt.trim());
        if (focusAfter) {
          await focusResource("agent", agentName);
          shouldCloseRaycast = await revealFocusedHerdr();
        }
      },
      { success: `${agentName} Started` },
    );
    if (!success) return;

    if (shouldCloseRaycast) {
      void onDone?.();
      await closeMainWindow({ clearRootSearch: true });
    } else {
      await onDone?.();
      pop();
    }
  }

  return (
    <Form
      navigationTitle="Start Agent"
      isLoading={snapshot.isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Start Agent" icon={Icon.Play} onSubmit={submit} />
          <Action.CreateQuicklink
            title={environment.trim() ? "Create Quicklink Without Environment" : "Create Quicklink"}
            icon={Icon.Link}
            quicklink={{ name: quicklinkName, link: quicklink, icon: Icon.Terminal }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="kind" title="Agent" value={kind} onChange={(value) => setKind(value as AgentKind)} storeValue>
        {AGENT_KINDS.map((agentKind) => (
          <Form.Dropdown.Item
            key={agentKind}
            value={agentKind}
            title={agentTitle(agentKind)}
            icon={agentIcon(agentKind)}
          />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="name"
        title="Name"
        placeholder={`Defaults to ${kind}`}
        value={name}
        onChange={(value) => {
          setName(value);
          setNameError(undefined);
        }}
        error={nameError}
        autoFocus
      />
      <Form.Dropdown
        id="destination"
        title="Destination"
        value={destination}
        onChange={(value) => setDestination(value as AgentDestination)}
      >
        {panes.length ? (
          <Form.Dropdown.Section title="Available Panes">
            {panes.map((pane) => (
              <Form.Dropdown.Item
                key={pane.pane_id}
                value={`pane:${pane.pane_id}`}
                title={pane.title || pane.terminal_title_stripped || pane.cwd || pane.pane_id}
                icon={Icon.Terminal}
              />
            ))}
          </Form.Dropdown.Section>
        ) : null}
        <Form.Dropdown.Section title="Create">
          {(data?.workspaces || []).map((workspace) => (
            <Form.Dropdown.Item
              key={workspace.workspace_id}
              value={`tab:${workspace.workspace_id}`}
              title={`New Tab in ${workspace.label}`}
              icon={Icon.Plus}
            />
          ))}
          <Form.Dropdown.Item value="new-workspace" title="New Workspace" icon={Icon.NewDocument} />
          {data?.focused_pane_id ? (
            <Form.Dropdown.Item value="split-right" title="Split Focused Pane Right" icon={Icon.ArrowRight} />
          ) : null}
          {data?.focused_pane_id ? (
            <Form.Dropdown.Item value="split-down" title="Split Focused Pane Down" icon={Icon.ArrowDown} />
          ) : null}
        </Form.Dropdown.Section>
      </Form.Dropdown>
      {createsDestination ? (
        <>
          <Form.FilePicker
            id="cwd"
            title="Working Directory"
            value={cwd}
            onChange={setCwd}
            allowMultipleSelection={false}
            canChooseDirectories
            canChooseFiles={false}
          />
          <Form.TextArea
            id="environment"
            title="Environment"
            placeholder={"ROLE=development\nPORT=3000"}
            value={environment}
            onChange={(value) => {
              setEnvironment(value);
              setEnvironmentError(undefined);
            }}
            error={environmentError}
          />
        </>
      ) : null}
      <Form.TextField
        id="arguments"
        title="Arguments"
        placeholder="Optional agent arguments"
        value={argumentsText}
        onChange={(value) => {
          setArgumentsText(value);
          setArgumentsError(undefined);
        }}
        error={argumentsError}
      />
      <Form.TextArea
        id="prompt"
        title="Initial Prompt"
        placeholder="Sent after the agent is ready"
        value={prompt}
        onChange={setPrompt}
      />
      <Form.Checkbox
        id="focusAfter"
        label="Focus after starting"
        value={focusAfter}
        onChange={setFocusAfter}
        storeValue
      />
      <Form.Description text="Herdr waits for the agent to become interactive before sending the prompt or changing focus." />
    </Form>
  );
}
