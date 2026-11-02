import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  confirmAlert,
  Icon,
  Keyboard,
  open,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { createDesktopLink, ensureDesktopRunning, revokeDesktopLinks } from "../services/desktop";
import { pauseMachine, resumeMachine, startMachine, stopMachine } from "../services/lifecycle";
import { deleteMachine } from "../services/machines";
import { createSshToken, revokeSshTokens } from "../services/ssh";
import { Machine, Operation } from "../types";
import { showError } from "../utils/errors";
import { formatDateTime, formatRelative } from "../utils/format";
import { canExec, isBusy } from "../utils/machine-state";
import { runOperation } from "../utils/operations";
import { Shortcuts } from "../utils/shortcuts";
import { openInTerminal } from "../utils/terminal";
import { CreateMachineForm } from "./create-machine-form";
import { CreateSnapshotForm } from "./create-snapshot-form";
import { DesktopScreenshot } from "./desktop-screenshot";
import { IdlePauseForm } from "./idle-pause-form";
import { MachineDetails } from "./machine-details";
import { MetadataForm } from "./metadata-form";
import { PublicPortsList } from "./public-ports";
import { RunCommandForm } from "./run-command-form";
import { UsageDetail } from "./usage-detail";

interface MachineActionsProps {
  machine: Machine;
  /** Refreshes whatever shows the machine. */
  onChange: () => void;
  /** Leaves out "View Details" when the details are already shown. */
  isShowingDetails?: boolean;
}

export function MachineActions({ machine, onChange, isShowingDetails }: MachineActionsProps) {
  const { pop } = useNavigation();
  const busy = isBusy(machine);
  const running = machine.state === "running" && !busy;
  const paused = machine.state === "suspended" && !busy;
  const stopped = (machine.state === "stopped" || machine.state === "error") && !busy;
  // SSH tokens and desktop links stay valid while a machine is paused or stopped, so they can be revoked then too.
  const live = machine.state !== "deleting" && machine.state !== "deleted";
  const { name, id } = machine;

  function afterWake(operation: Operation) {
    if (operation.machine?.runtime.processesPreserved === false) {
      return "Its programs could not be restored, so it booted fresh. Files are kept.";
    }
  }

  async function lifecycle(kind: "start" | "stop" | "pause" | "resume") {
    const config = {
      start: { run: startMachine, title: `Starting ${name}`, done: `Started ${name}` },
      stop: { run: stopMachine, title: `Stopping ${name}`, done: `Stopped ${name}` },
      pause: { run: pauseMachine, title: `Pausing ${name}`, done: `Paused ${name}` },
      resume: { run: resumeMachine, title: `Resuming ${name}`, done: `Resumed ${name}` },
    }[kind];

    if (kind === "stop") {
      const confirmed = await confirmAlert({
        title: `Stop ${name}?`,
        message: "Running programs end. Files are kept, and you can start it again later.",
        icon: Icon.Stop,
        primaryAction: { title: "Stop Machine" },
      });
      if (!confirmed) return;
    }

    const wakes = kind === "start" || kind === "resume";
    await runOperation(() => config.run(id), {
      title: config.title,
      successTitle: config.done,
      onAccepted: onChange,
      successMessage: wakes ? afterWake : undefined,
    });
    onChange();
  }

  async function remove() {
    const confirmed = await confirmAlert({
      title: `Delete ${name}?`,
      message: "This deletes the machine, its system files and its storage. Snapshots saved from it are kept.",
      icon: Icon.Trash,
      primaryAction: { title: "Delete Machine", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await runOperation(() => deleteMachine(id), {
      title: `Deleting ${name}`,
      successTitle: `Deleted ${name}`,
      onAccepted: () => {
        if (isShowingDetails) pop();
        onChange();
      },
    });
    onChange();
  }

  async function connectSsh() {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Creating SSH login…" });
    try {
      const token = await createSshToken(id);
      await openInTerminal(token.command);
      toast.style = Toast.Style.Success;
      toast.title = `Opened SSH to ${name}`;
      toast.message = `Confirm host key ${token.hostKeyFingerprint} on first connect`;
    } catch (error) {
      await showError(error, { toast, title: "Could not open SSH" });
    }
  }

  async function copySsh(kind: "ssh" | "mosh") {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Creating SSH login…" });
    try {
      const token = await createSshToken(id);
      const command = kind === "mosh" ? token.moshCommand : token.command;
      if (!command) throw new Error("Mosh is not available for this machine");
      await Clipboard.copy(command, { concealed: true });
      toast.style = Toast.Style.Success;
      toast.title = kind === "mosh" ? "Copied Mosh command" : "Copied SSH command";
      toast.message = `Anyone with it can log in until ${formatDateTime(token.expiresAt)}`;
    } catch (error) {
      await showError(error, { toast, title: "Could not create an SSH login" });
    }
  }

  async function revokeSsh() {
    const confirmed = await confirmAlert({
      title: "Revoke SSH tokens?",
      message: "Every SSH token of this machine stops working, and the connections that use them close.",
      primaryAction: { title: "Revoke Tokens", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    const toast = await showToast({ style: Toast.Style.Animated, title: "Revoking SSH tokens…" });
    try {
      const { revoked } = await revokeSshTokens(id);
      toast.style = Toast.Style.Success;
      toast.title = `Revoked ${revoked} SSH token${revoked === 1 ? "" : "s"}`;
    } catch (error) {
      await showError(error, { toast });
    }
  }

  async function desktopLink(mode: "open" | "copy-view" | "copy-interactive") {
    if (mode === "copy-interactive") {
      const confirmed = await confirmAlert({
        title: "Copy an interactive desktop link?",
        message:
          "Anyone with this link can see and control the desktop for the next hour without signing in. Use Revoke Desktop Links to end access early.",
        icon: Icon.Warning,
        primaryAction: { title: "Copy Link" },
      });
      if (!confirmed) return;
    }
    const toast = await showToast({ style: Toast.Style.Animated, title: "Preparing the desktop…" });
    try {
      await ensureDesktopRunning(id, (message) => (toast.message = message));
      const link = await createDesktopLink(id, { viewOnly: mode === "copy-view" });
      if (mode === "open") {
        await open(link.url);
        toast.title = `Opened ${name}'s desktop`;
      } else {
        // Anyone with the link can open the desktop without signing in, so keep it out of clipboard history.
        await Clipboard.copy(link.url, { concealed: true });
        toast.title = mode === "copy-view" ? "Copied view-only desktop link" : "Copied interactive desktop link";
      }
      toast.style = Toast.Style.Success;
      toast.message = `The link expires ${formatRelative(link.expiresAt)}`;
    } catch (error) {
      await showError(error, { toast, title: "Could not open the desktop" });
    }
  }

  async function revokeDesktop() {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Revoking desktop links…" });
    try {
      await revokeDesktopLinks(id);
      toast.style = Toast.Style.Success;
      toast.title = "Revoked desktop links";
      toast.message = "Open sessions end within a few seconds";
    } catch (error) {
      await showError(error, { toast });
    }
  }

  const createMachineAction = (
    <Action.Push
      title="Create Machine"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<CreateMachineForm onSubmitted={onChange} />}
    />
  );

  return (
    <ActionPanel title={name}>
      <ActionPanel.Section>
        {!isShowingDetails && (
          <Action.Push
            title="View Details"
            icon={Icon.Sidebar}
            target={<MachineDetails machine={machine} onChange={onChange} />}
          />
        )}
        {running && <Action title="Open SSH in Terminal" icon={Icon.Terminal} onAction={connectSsh} />}
        {canExec(machine) && (
          <Action.Push
            title="Run Command"
            icon={Icon.Code}
            shortcut={Shortcuts.RunCommand}
            target={<RunCommandForm machineId={id} />}
          />
        )}
        {paused && (
          <Action
            title="Resume Machine"
            icon={Icon.Play}
            shortcut={Shortcuts.PauseResume}
            onAction={() => lifecycle("resume")}
          />
        )}
        {stopped && (
          <Action
            title="Start Machine"
            icon={Icon.Power}
            shortcut={Shortcuts.StartStop}
            onAction={() => lifecycle("start")}
          />
        )}
      </ActionPanel.Section>

      {running && (
        <ActionPanel.Section title="Desktop">
          <Action
            title="Open Desktop"
            icon={Icon.Desktop}
            shortcut={Shortcuts.OpenDesktop}
            onAction={() => desktopLink("open")}
          />
          <Action.Push
            title="Take Screenshot"
            icon={Icon.Camera}
            shortcut={Shortcuts.Screenshot}
            target={<DesktopScreenshot machine={machine} />}
          />
          <Action title="Copy View-Only Desktop Link" icon={Icon.Eye} onAction={() => desktopLink("copy-view")} />
          <Action
            title="Copy Interactive Desktop Link"
            icon={Icon.Link}
            onAction={() => desktopLink("copy-interactive")}
          />
        </ActionPanel.Section>
      )}

      {(running || paused) && (
        <ActionPanel.Section title="Lifecycle">
          {running && (
            <Action
              title="Pause Machine"
              icon={Icon.Pause}
              shortcut={Shortcuts.PauseResume}
              onAction={() => lifecycle("pause")}
            />
          )}
          {running && (
            <Action
              title="Stop Machine"
              icon={Icon.Stop}
              shortcut={Shortcuts.StartStop}
              onAction={() => lifecycle("stop")}
            />
          )}
        </ActionPanel.Section>
      )}

      {live && (
        <ActionPanel.Section title="Manage">
          <Action.Push
            title="Set Idle Pause"
            icon={Icon.Clock}
            shortcut={Shortcuts.IdlePause}
            target={<IdlePauseForm machine={machine} onSaved={onChange} />}
          />
          <Action.Push
            title="Edit Labels"
            icon={Icon.Tag}
            target={<MetadataForm machine={machine} onSaved={onChange} />}
          />
          {(running || (machine.state === "stopped" && !busy)) && (
            <Action.Push
              title="Create Snapshot"
              icon={Icon.SaveDocument}
              shortcut={Shortcuts.Snapshot}
              target={<CreateSnapshotForm machine={machine} />}
            />
          )}
          <Action.Push
            title="Public Ports"
            icon={Icon.Globe}
            shortcut={Shortcuts.Ports}
            target={<PublicPortsList machine={machine} />}
          />
          {createMachineAction}
        </ActionPanel.Section>
      )}

      <ActionPanel.Section title="Copy">
        <Action.CopyToClipboard title="Copy Machine ID" content={id} shortcut={Shortcuts.CopyId} />
        <Action.CopyToClipboard title="Copy Machine Name" content={name} />
        {running && (
          <Action
            title="Copy SSH Command"
            icon={Icon.Key}
            shortcut={Shortcuts.CopySsh}
            onAction={() => copySsh("ssh")}
          />
        )}
        {running && <Action title="Copy Mosh Command" icon={Icon.Key} onAction={() => copySsh("mosh")} />}
        <Action.CopyToClipboard title="Copy InstaBox CLI SSH Command" content={`instabox ssh ${name}`} />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action.Push
          title="View Usage and Limits"
          icon={Icon.Gauge}
          shortcut={Shortcuts.Usage}
          target={<UsageDetail />}
        />
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={onChange}
        />
        {live && <Action title="Revoke SSH Tokens" icon={Icon.LockUnlocked} onAction={revokeSsh} />}
        {live && <Action title="Revoke Desktop Links" icon={Icon.XMarkCircle} onAction={revokeDesktop} />}
        {live && !busy && (
          <Action
            title="Delete Machine"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={Keyboard.Shortcut.Common.Remove}
            onAction={remove}
          />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
