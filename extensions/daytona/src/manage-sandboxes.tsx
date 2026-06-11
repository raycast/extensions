import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, List, Toast, open, showToast } from "@raycast/api";
import { Sandbox } from "@daytona/sdk";
import { useMemo } from "react";
import { getDaytonaErrorMessage } from "./daytona-client";
import { getDashboardUrl } from "./dashboard-url";
import { getDaytonaPreferences } from "./daytona-preferences";
import { useDaytonaClient, useSandboxList } from "./use-sandbox-list";

const WEB_TERMINAL_PORT = 22222;
const WEB_TERMINAL_SIGNED_TTL_SECONDS = 3600;

export default function ManageSandboxesCommand() {
  const preferences = getDaytonaPreferences();
  const daytona = useDaytonaClient();
  const { sandboxes, isLoading, loadingError, loadSandboxes } = useSandboxList();

  function getStateValue(sandbox: Sandbox): string {
    return sandbox.state?.toString().toLowerCase() || "unknown";
  }

  function getStateAccessory(sandbox: Sandbox): List.Item.Accessory {
    const state = getStateValue(sandbox);

    if (state === "started") return { tag: { value: "Started", color: Color.Green } };
    if (state === "stopped") return { tag: { value: "Stopped", color: Color.Orange } };
    if (state === "archived") return { tag: { value: "Archived", color: Color.SecondaryText } };
    if (state === "error") return { tag: { value: "Error", color: Color.Red } };

    return { tag: { value: state || "Unknown", color: Color.SecondaryText } };
  }

  function getDateAccessory(sandbox: Sandbox): List.Item.Accessory | null {
    const value = sandbox.lastActivityAt || sandbox.updatedAt || sandbox.createdAt;
    if (!value) return null;

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    return { date, tooltip: "Last Activity" };
  }

  async function runSandboxAction(
    sandbox: Sandbox,
    options: {
      loadingTitle: string;
      successTitle: string;
      run: (refreshedSandbox: Sandbox) => Promise<void>;
    },
  ) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: options.loadingTitle,
    });

    try {
      const refreshedSandbox = await daytona.get(sandbox.id);
      await options.run(refreshedSandbox);
      toast.style = Toast.Style.Success;
      toast.title = options.successTitle;
      toast.message = refreshedSandbox.name || refreshedSandbox.id;
      await loadSandboxes();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Operation failed";
      toast.message = getDaytonaErrorMessage(error);
    }
  }

  async function handleStart(sandbox: Sandbox) {
    await runSandboxAction(sandbox, {
      loadingTitle: "Starting sandbox",
      successTitle: "Sandbox started",
      run: async (current) => {
        await current.start();
      },
    });
  }

  async function handleStop(sandbox: Sandbox) {
    await runSandboxAction(sandbox, {
      loadingTitle: "Stopping sandbox",
      successTitle: "Sandbox stopped",
      run: async (current) => {
        await current.stop();
      },
    });
  }

  async function handleArchive(sandbox: Sandbox) {
    await runSandboxAction(sandbox, {
      loadingTitle: "Archiving sandbox",
      successTitle: "Sandbox archived",
      run: async (current) => {
        if (getStateValue(current) === "started") {
          await current.stop();
        }
        await current.archive();
      },
    });
  }

  async function handleDelete(sandbox: Sandbox) {
    const confirmed = await confirmAlert({
      title: "Delete Sandbox?",
      message: `This will permanently delete ${sandbox.name || sandbox.id}.`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    await runSandboxAction(sandbox, {
      loadingTitle: "Deleting sandbox",
      successTitle: "Sandbox deleted",
      run: async (current) => {
        await current.delete();
      },
    });
  }

  async function handleOpenWebTerminal(sandbox: Sandbox) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Opening web terminal",
    });

    try {
      const current = await daytona.get(sandbox.id);
      if (getStateValue(current) !== "started") {
        toast.title = "Starting sandbox";
        await current.start();
      }

      const signedUrl = await current.getSignedPreviewUrl(WEB_TERMINAL_PORT, WEB_TERMINAL_SIGNED_TTL_SECONDS);
      await open(signedUrl.url);

      toast.style = Toast.Style.Success;
      toast.title = "Web terminal opened";
      toast.message = current.name || current.id;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to open web terminal";
      toast.message = getDaytonaErrorMessage(error);
    }
  }

  const sortedSandboxes = useMemo(
    () =>
      [...sandboxes].sort((a, b) => {
        const aDate = new Date(a.lastActivityAt || a.updatedAt || a.createdAt || 0).getTime();
        const bDate = new Date(b.lastActivityAt || b.updatedAt || b.createdAt || 0).getTime();
        return bDate - aDate;
      }),
    [sandboxes],
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter sandboxes by name or ID"
      isShowingDetail={false}
      filtering={true}
    >
      {loadingError ? <List.EmptyView title="Failed to load sandboxes" description={loadingError} /> : null}

      {!loadingError && sortedSandboxes.length === 0 && !isLoading ? (
        <List.EmptyView title="No sandboxes found" description="Create a sandbox and refresh this command." />
      ) : null}

      {sortedSandboxes.map((sandbox) => {
        const accessories: List.Item.Accessory[] = [getStateAccessory(sandbox)];
        const dateAccessory = getDateAccessory(sandbox);
        if (dateAccessory) accessories.push(dateAccessory);

        return (
          <List.Item
            key={sandbox.id}
            title={sandbox.name || sandbox.id}
            subtitle={sandbox.id}
            accessories={accessories}
            keywords={[sandbox.target || "", `${sandbox.cpu}cpu`, `${sandbox.memory}gib`, `${sandbox.disk}gib`]}
            actions={
              <ActionPanel>
                {getStateValue(sandbox) === "started" ? (
                  <Action
                    title="Stop Sandbox"
                    icon={Icon.Stop}
                    onAction={() => handleStop(sandbox)}
                    shortcut={{ modifiers: ["cmd"], key: "s" }}
                  />
                ) : (
                  <Action
                    title="Start Sandbox"
                    icon={Icon.Play}
                    onAction={() => handleStart(sandbox)}
                    shortcut={{ modifiers: ["cmd"], key: "s" }}
                  />
                )}
                <Action
                  title="Open Web Terminal"
                  icon={Icon.Terminal}
                  onAction={() => handleOpenWebTerminal(sandbox)}
                  shortcut={{ modifiers: ["cmd"], key: "t" }}
                />
                <Action
                  title="Open in Dashboard"
                  icon={Icon.Globe}
                  onAction={() => open(getDashboardUrl(preferences.apiUrl, `sandboxes?sandboxId=${sandbox.id}`))}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
                <Action
                  title="Archive Sandbox"
                  icon={Icon.ArrowDownCircle}
                  onAction={() => handleArchive(sandbox)}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                />
                <Action
                  title="Delete Sandbox"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => handleDelete(sandbox)}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                />
                <Action.CopyToClipboard
                  title="Copy Sandbox ID"
                  content={sandbox.id}
                  shortcut={{ modifiers: ["cmd"], key: "." }}
                />
                <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={loadSandboxes} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
