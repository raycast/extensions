import {
  Action,
  ActionPanel,
  Alert,
  Icon,
  Keyboard,
  closeMainWindow,
  confirmAlert,
  openExtensionPreferences,
} from "@raycast/api";
import { focusResource, getAgentTarget, runHerdr, sendAgentKeys, sendPaneKeys } from "../lib/herdr";
import { launchHerdrInTerminal, revealFocusedHerdr } from "../lib/terminal";
import type { AgentInfo, PaneInfo, TabInfo, WorkspaceInfo } from "../lib/types";
import { runAction, shortcuts } from "../lib/ui";
import { PaneOutput } from "./pane-output";
import { PromptAgentForm } from "./prompt-agent-form";
import { CreateTabForm, RenameForm, RunCommandForm, SplitPaneForm } from "./resource-forms";
import { CreateWorkspaceForm } from "./create-workspace-form";
import { CreateWorktreeForm } from "./create-worktree-form";
import { StartAgentForm } from "./start-agent-form";

function displayAgent(agent: AgentInfo): string {
  return agent.name || agent.display_agent || agent.agent || agent.pane_id;
}

function UtilityActions({ onRefresh }: { onRefresh?: () => void | Promise<void> }) {
  return (
    <ActionPanel.Section>
      {onRefresh ? (
        <Action title="Refresh" icon={Icon.ArrowClockwise} shortcut={shortcuts.refresh} onAction={onRefresh} />
      ) : null}
      <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
      <Action.OpenInBrowser title="Open Herdr Documentation" url="https://herdr.dev/docs/" />
    </ActionPanel.Section>
  );
}

async function focus(kind: "workspace" | "tab" | "pane" | "agent", id: string, onDone?: () => void | Promise<void>) {
  let shouldCloseRaycast = false;
  const succeeded = await runAction(
    `Focusing ${kind}`,
    async () => {
      await focusResource(kind, id);
      shouldCloseRaycast = await revealFocusedHerdr();
    },
    { success: `${kind[0].toUpperCase()}${kind.slice(1)} Focused` },
  );
  if (!succeeded) return;
  if (shouldCloseRaycast) {
    void onDone?.();
    await closeMainWindow({ clearRootSearch: true });
  } else {
    await onDone?.();
  }
}

async function closeResource(
  kind: "workspace" | "tab" | "pane",
  id: string,
  label: string,
  onDone?: () => void | Promise<void>,
) {
  const confirmed = await confirmAlert({
    title: `Close ${kind} “${label}”?`,
    message:
      kind === "workspace"
        ? "All of its tabs, panes, and running processes will be stopped."
        : "Its running processes will be stopped.",
    primaryAction: { title: `Close ${kind[0].toUpperCase()}${kind.slice(1)}`, style: Alert.ActionStyle.Destructive },
  });
  if (!confirmed) return;
  await runAction(`Closing ${kind}`, () => runHerdr([kind, "close", id]).then(() => undefined), {
    success: `${kind[0].toUpperCase()}${kind.slice(1)} Closed`,
    onSuccess: onDone,
  });
}

export function AgentActions({
  agent,
  agents,
  onDone,
}: {
  agent: AgentInfo;
  agents: AgentInfo[];
  onDone?: () => void | Promise<void>;
}) {
  const target = getAgentTarget(agent);
  return (
    <ActionPanel>
      <Action title="Focus Agent" icon={Icon.BullsEye} onAction={() => focus("agent", target, onDone)} />
      <Action.Push
        title="Prompt Agent"
        icon={Icon.Message}
        shortcut={shortcuts.prompt}
        target={<PromptAgentForm agents={agents} initialAgentId={agent.pane_id} onSent={onDone} />}
      />
      <Action.Push
        title="View Live Output"
        icon={Icon.Eye}
        shortcut={shortcuts.output}
        target={<PaneOutput target={target} title={displayAgent(agent)} isAgent />}
      />
      <ActionPanel.Section title="Control">
        <Action
          title="Interrupt Agent"
          icon={Icon.Stop}
          shortcut={{ modifiers: ["ctrl"], key: "c" }}
          onAction={() =>
            runAction("Interrupting agent", () => sendAgentKeys(target, ["ctrl+c"]), {
              success: "Interrupt Sent",
              onSuccess: onDone,
            })
          }
        />
        <Action
          title="Send Escape"
          icon={Icon.XMarkCircle}
          shortcut={{ modifiers: ["cmd"] as const, key: "." }}
          onAction={() =>
            runAction("Sending Escape", () => sendAgentKeys(target, ["esc"]), {
              success: "Escape Sent",
              onSuccess: onDone,
            })
          }
        />
        <ActionPanel.Submenu title="Send Key" icon={Icon.Keyboard}>
          {[
            ["Enter", "enter"],
            ["Tab", "tab"],
            ["Shift Tab", "shift+tab"],
            ["Arrow Up", "up"],
            ["Arrow Down", "down"],
            ["Arrow Left", "left"],
            ["Arrow Right", "right"],
          ].map(([title, key]) => (
            <Action
              key={key}
              title={`Send ${title}`}
              onAction={() =>
                runAction(`Sending ${title}`, () => sendAgentKeys(target, [key]), { success: `${title} Sent` })
              }
            />
          ))}
        </ActionPanel.Submenu>
        <Action
          title="Attach in Terminal"
          icon={Icon.Terminal}
          shortcut={shortcuts.attach}
          onAction={async () => {
            const succeeded = await runAction(
              "Opening terminal",
              () => launchHerdrInTerminal(["agent", "attach", target]),
              {
                success: "Terminal Opened",
              },
            );
            if (succeeded) await closeMainWindow({ clearRootSearch: true });
          }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Manage">
        <Action.Push
          title="Rename Agent"
          icon={Icon.Pencil}
          shortcut={shortcuts.rename}
          target={<RenameForm kind="agent" id={target} currentName={agent.name || ""} onDone={onDone} />}
        />
        <Action.CopyToClipboard title="Copy Pane ID" content={agent.pane_id} shortcut={shortcuts.copyId} />
        {agent.foreground_cwd || agent.cwd ? (
          <Action.ShowInFinder path={agent.foreground_cwd || agent.cwd || ""} shortcut={shortcuts.copyPath} />
        ) : null}
      </ActionPanel.Section>
      <UtilityActions onRefresh={onDone} />
    </ActionPanel>
  );
}

export function WorkspaceActions({
  workspace,
  workspacePath,
  onDone,
}: {
  workspace: WorkspaceInfo;
  workspacePath?: string;
  onDone?: () => void | Promise<void>;
}) {
  return (
    <ActionPanel>
      <Action
        title="Focus Workspace"
        icon={Icon.BullsEye}
        onAction={() => focus("workspace", workspace.workspace_id, onDone)}
      />
      <ActionPanel.Section title="Create">
        <Action.Push
          title="Create Tab"
          icon={Icon.Plus}
          shortcut={shortcuts.create}
          target={<CreateTabForm workspaceId={workspace.workspace_id} onDone={onDone} />}
        />
        <Action.Push
          title="Create Workspace"
          icon={Icon.Folder}
          shortcut={shortcuts.createWorkspace}
          target={<CreateWorkspaceForm onDone={onDone} />}
        />
        <Action.Push
          title="Create Git Worktree"
          icon={Icon.Hammer}
          shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
          target={<CreateWorktreeForm initialWorkspaceId={workspace.workspace_id} onDone={onDone} />}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Manage">
        <Action.Push
          title="Rename Workspace"
          icon={Icon.Pencil}
          shortcut={shortcuts.rename}
          target={
            <RenameForm kind="workspace" id={workspace.workspace_id} currentName={workspace.label} onDone={onDone} />
          }
        />
        <Action.CopyToClipboard
          title="Copy Workspace ID"
          content={workspace.workspace_id}
          shortcut={shortcuts.copyId}
        />
        {workspace.worktree?.checkout_path || workspacePath ? (
          <Action.ShowInFinder
            path={workspace.worktree?.checkout_path || workspacePath || ""}
            shortcut={shortcuts.copyPath}
          />
        ) : null}
        <Action
          title="Close Workspace"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={shortcuts.delete}
          onAction={() => closeResource("workspace", workspace.workspace_id, workspace.label, onDone)}
        />
      </ActionPanel.Section>
      <UtilityActions onRefresh={onDone} />
    </ActionPanel>
  );
}

export function TabActions({ tab, onDone }: { tab: TabInfo; onDone?: () => void | Promise<void> }) {
  return (
    <ActionPanel>
      <Action title="Focus Tab" icon={Icon.BullsEye} onAction={() => focus("tab", tab.tab_id, onDone)} />
      <Action.Push
        title="Rename Tab"
        icon={Icon.Pencil}
        shortcut={shortcuts.rename}
        target={<RenameForm kind="tab" id={tab.tab_id} currentName={tab.label} onDone={onDone} />}
      />
      <Action.CopyToClipboard title="Copy Tab ID" content={tab.tab_id} shortcut={shortcuts.copyId} />
      <Action
        title="Close Tab"
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        shortcut={shortcuts.delete}
        onAction={() => closeResource("tab", tab.tab_id, tab.label, onDone)}
      />
      <UtilityActions onRefresh={onDone} />
    </ActionPanel>
  );
}

export function PaneActions({
  pane,
  agents,
  onDone,
}: {
  pane: PaneInfo;
  agents: AgentInfo[];
  onDone?: () => void | Promise<void>;
}) {
  const label = pane.title || pane.terminal_title_stripped || pane.terminal_title || pane.pane_id;
  const agent = agents.find((candidate) => candidate.pane_id === pane.pane_id);
  if (agent) return <AgentActions agent={agent} agents={agents} onDone={onDone} />;

  return (
    <ActionPanel>
      <Action title="Focus Pane" icon={Icon.BullsEye} onAction={() => focus("pane", pane.pane_id, onDone)} />
      <Action.Push
        title="View Live Output"
        icon={Icon.Eye}
        shortcut={shortcuts.output}
        target={<PaneOutput target={pane.pane_id} title={label} />}
      />
      <Action.Push
        title="Run Command"
        icon={Icon.Terminal}
        shortcut={Keyboard.Shortcut.Common.Edit}
        target={<RunCommandForm paneId={pane.pane_id} onDone={onDone} />}
      />
      <Action.Push
        title="Start Agent"
        icon={Icon.Person}
        shortcut={shortcuts.startAgent}
        target={<StartAgentForm initialPaneId={pane.pane_id} onDone={onDone} />}
      />
      <ActionPanel.Section title="Layout">
        <Action.Push
          title="Split Pane"
          icon={Icon.Sidebar}
          shortcut={{ modifiers: ["cmd"], key: "d" }}
          target={<SplitPaneForm paneId={pane.pane_id} onDone={onDone} />}
        />
        <Action
          title="Toggle Zoom"
          icon={Icon.Maximize}
          shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
          onAction={() =>
            runAction(
              "Toggling pane zoom",
              () => runHerdr(["pane", "zoom", pane.pane_id, "--toggle"]).then(() => undefined),
              { success: "Pane Zoom Toggled", onSuccess: onDone },
            )
          }
        />
        <ActionPanel.Submenu title="Send Key" icon={Icon.Keyboard}>
          {["enter", "esc", "tab", "shift+tab", "ctrl+c", "up", "down", "left", "right"].map((key) => (
            <Action
              key={key}
              title={`Send ${key}`}
              onAction={() =>
                runAction(`Sending ${key}`, () => sendPaneKeys(pane.pane_id, [key]), { success: `${key} Sent` })
              }
            />
          ))}
        </ActionPanel.Submenu>
      </ActionPanel.Section>
      <ActionPanel.Section title="Manage">
        <Action.Push
          title="Rename Pane"
          icon={Icon.Pencil}
          shortcut={shortcuts.rename}
          target={<RenameForm kind="pane" id={pane.pane_id} currentName={pane.title || ""} onDone={onDone} />}
        />
        <Action.CopyToClipboard title="Copy Pane ID" content={pane.pane_id} shortcut={shortcuts.copyId} />
        {pane.foreground_cwd || pane.cwd ? (
          <Action.ShowInFinder path={pane.foreground_cwd || pane.cwd || ""} shortcut={shortcuts.copyPath} />
        ) : null}
        <Action
          title="Close Pane"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={shortcuts.delete}
          onAction={() => closeResource("pane", pane.pane_id, label, onDone)}
        />
      </ActionPanel.Section>
      <UtilityActions onRefresh={onDone} />
    </ActionPanel>
  );
}
