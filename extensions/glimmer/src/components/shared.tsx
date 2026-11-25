import { Action, ActionPanel, closeMainWindow, Color, Icon, List, open, showToast, Toast } from "@raycast/api";
import { buildURL, pcState } from "../lib/contract";
import type { PC } from "../lib/contract";
import { DOWNLOAD_URL, errorMessage, HOMEBREW_COMMAND, MissingCLIError, streamPC, wakePC } from "../lib/glimmer";

export const ignoreErrorToast = () => undefined;

export async function openGlimmer() {
  try {
    await open("/Applications/Glimmer.app");
  } catch (error) {
    await showError(error);
  }
}

export async function showError(error: unknown) {
  await showToast({
    style: Toast.Style.Failure,
    title: error instanceof MissingCLIError ? "Set up Glimmer" : "Glimmer couldn’t complete the request",
    message: errorMessage(error),
    primaryAction: {
      title: error instanceof MissingCLIError ? "Download Glimmer" : "Open Glimmer",
      onAction: () => open(error instanceof MissingCLIError ? DOWNLOAD_URL : "/Applications/Glimmer.app"),
    },
  });
}

export async function openLink(url: string) {
  try {
    await open(url);
  } catch (error) {
    await showError(error);
  }
}

const wakingPCs = new Set<string>();

type Refresh = () => void | Promise<unknown>;

export async function wakeWithToast(pc: PC, refresh: Refresh) {
  if (wakingPCs.has(pc.id)) return;
  wakingPCs.add(pc.id);
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Waking ${pc.name}…`,
    message: "Waiting up to 90 seconds for the PC to answer…",
  });
  try {
    await wakePC(pc);
    toast.style = Toast.Style.Success;
    toast.title = `${pc.name} is awake`;
    toast.message = "The PC answered.";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = `Couldn’t wake ${pc.name}`;
    toast.message = errorMessage(error);
    return;
  } finally {
    wakingPCs.delete(pc.id);
  }
  // A subsequent listing failure must not turn a successful wake into a failure.
  try {
    await refresh();
  } catch (error) {
    await showError(error);
  }
}

const launchingPCs = new Set<string>();

export async function streamWithToast(pc: PC, app?: string) {
  if (launchingPCs.has(pc.id)) return;
  launchingPCs.add(pc.id);
  let toast: Toast | undefined;
  let waking = pc.state === "asleep";
  try {
    toast = await showToast({
      style: Toast.Style.Animated,
      title: waking ? `Waking ${pc.name}…` : "Opening stream…",
    });
    if (waking) await wakePC(pc);
    waking = false;
    toast.title = "Opening stream…";
    await streamPC(pc, app);
    toast.style = Toast.Style.Success;
    toast.title = "Stream requested";
    await closeMainWindow();
  } catch (error) {
    if (toast) {
      toast.style = Toast.Style.Failure;
      toast.title = waking ? `Couldn’t wake ${pc.name}` : "Couldn’t start streaming";
      toast.message = errorMessage(error);
      toast.primaryAction = { title: "Open Glimmer", onAction: openGlimmer };
    } else {
      await showError(error);
    }
  } finally {
    launchingPCs.delete(pc.id);
  }
}

export function SetupActions() {
  return (
    <ActionPanel>
      <Action.OpenInBrowser title="Download Glimmer" url={DOWNLOAD_URL} />
      <Action.CopyToClipboard title="Copy Homebrew command" content={HOMEBREW_COMMAND} />
    </ActionPanel>
  );
}

export function ErrorView({ error, refresh }: { error: Error; refresh: Refresh }) {
  const missing = error instanceof MissingCLIError;
  return (
    <List>
      <List.EmptyView
        icon={missing ? "extension-icon.png" : Icon.ExclamationMark}
        title={missing ? "Set up Glimmer" : "Couldn’t read Glimmer"}
        description={
          missing
            ? `Install Glimmer, then choose Glimmer › Install Command Line Tool…\n\nOr use Homebrew:\n${HOMEBREW_COMMAND}`
            : error.message
        }
        actions={
          missing ? (
            <SetupActions />
          ) : (
            <ActionPanel>
              <Action title="Try again" icon={Icon.ArrowClockwise} onAction={refresh} />
              <Action title="Open Glimmer" icon="extension-icon.png" onAction={openGlimmer} />
            </ActionPanel>
          )
        }
      />
    </List>
  );
}

export function NoPCs() {
  return (
    <List.EmptyView
      icon={Icon.Desktop}
      title="No paired PCs"
      description="Open Glimmer and pair the PC to see its apps here."
      actions={
        <ActionPanel>
          <Action title="Open Glimmer" icon="extension-icon.png" onAction={openGlimmer} />
        </ActionPanel>
      }
    />
  );
}

export function stateAccessory(pc: PC, unavailable = false): List.Item.Accessory {
  const state = unavailable ? "Unavailable" : pcState(pc);
  const color = state === "Streaming" ? Color.Blue : state === "Ready" ? Color.Green : Color.SecondaryText;
  return { tag: { value: state, color }, tooltip: `${pc.name}: ${state.toLowerCase()}` };
}

export function PCControls({ pc, refresh }: { pc: PC; refresh: Refresh }) {
  return (
    <>
      <Action title="Wake PC" icon={Icon.Power} onAction={() => wakeWithToast(pc, refresh)} />
      <Action title="Quit app on PC" icon={Icon.XMarkCircle} onAction={() => openLink(buildURL("quit", pc.id))} />
      <Action title="Refresh apps" icon={Icon.ArrowClockwise} onAction={refresh} />
      <Action title="Open Glimmer" icon="extension-icon.png" onAction={openGlimmer} />
    </>
  );
}
