import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Form,
  Icon,
  List,
  confirmAlert,
  showToast,
  Toast,
  environment,
  BrowserExtension,
  open,
  useNavigation,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import {
  getAllInstances,
  getAllWorkspacesFlat,
  saveInstanceWorkspaces,
  saveInstancesFromMaster,
  addWorkspaceToInstance,
  recordInstanceAccess,
  isSessionStale,
  isSessionStaleSync,
  toggleInstanceHidden,
  toggleWorkspaceHidden,
  removeInstance,
  setAllWorkspacesHidden,
  setWorkspaceAlias,
  isDevInstance,
  getMasterUrl,
} from "./storage";
import {
  parseWorkspacesFromHtml,
  parseInstanceName,
  extractBaseUrl,
  parseInstancesFromMasterHtml,
  parseWorkspaceNameFromPage,
  parseWorkspaceIdFromUrl,
} from "./parse-workspaces";

async function countdownToast(title: string, seconds: number) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `${title} (${seconds}s)`,
    primaryAction: {
      title: "Skip ⌘S",
      shortcut: { modifiers: ["cmd"], key: "s" },
      onAction: () => {
        /* handled below */
      },
    },
  });

  let skipped = false;
  toast.primaryAction = {
    title: "Skip ⌘S",
    shortcut: { modifiers: ["cmd"], key: "s" },
    onAction: () => {
      skipped = true;
    },
  };

  for (let i = seconds - 1; i >= 0; i--) {
    await new Promise((r) => setTimeout(r, 1000));
    if (skipped) break;
    if (i > 0) toast.title = `${title} (${i}s)`;
  }
  await toast.hide();
}

async function scrapeWorkspacesFromBrowser(
  instanceBaseUrl: string,
): Promise<{ html: string; baseUrl: string } | null> {
  const tabs = await BrowserExtension.getTabs();
  const tab = tabs.find(
    (t) => t.url.startsWith(instanceBaseUrl) && t.url.match(/\/workspace\/?$/),
  );

  if (!tab) return null;

  const html = await BrowserExtension.getContent({
    format: "html",
    tabId: tab.id,
  });
  return { html, baseUrl: instanceBaseUrl };
}

function SetAliasForm({
  baseUrl,
  workspaceId,
  currentAlias,
  onSaved,
}: {
  baseUrl: string;
  workspaceId: string;
  currentAlias?: string;
  onSaved: () => void;
}) {
  const { pop } = useNavigation();
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Alias"
            onSubmit={async (values: { alias: string }) => {
              await setWorkspaceAlias(
                baseUrl,
                workspaceId,
                values.alias.trim(),
              );
              onSaved();
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="alias"
        title="Alias"
        defaultValue={currentAlias ?? ""}
        placeholder="Enter an alias for this workspace"
      />
    </Form>
  );
}

function AddWorkspaceForm({
  baseUrl,
  workspaceId,
  workspaceName,
  onSaved,
}: {
  baseUrl: string;
  workspaceId: string;
  workspaceName: string;
  onSaved: () => void;
}) {
  const { pop } = useNavigation();
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Workspace"
            onSubmit={async (values: { instanceName: string }) => {
              const name = values.instanceName.trim();
              if (!name) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Instance name is required",
                });
                return;
              }
              await addWorkspaceToInstance(baseUrl, name, {
                id: workspaceId,
                name: workspaceName,
              });
              await recordInstanceAccess(baseUrl, workspaceId);
              await showToast({
                style: Toast.Style.Success,
                title: `Added "${workspaceName}" to ${name}`,
              });
              onSaved();
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="instanceName"
        title="Instance Name"
        placeholder="Enter the instance name"
      />
      <Form.Description
        title="Workspace"
        text={`${workspaceName} (#${workspaceId})`}
      />
      <Form.Description title="Domain" text={new URL(baseUrl).host} />
    </Form>
  );
}

export default function Command() {
  const { push } = useNavigation();
  const [showHidden, setShowHidden] = useState(false);
  const { data, isLoading, revalidate } = usePromise(
    async (includeHidden: boolean) => {
      const instances = await getAllInstances();
      const flat = await getAllWorkspacesFlat({ includeHidden });
      const unloaded = Object.values(instances).filter(
        (inst) =>
          inst.workspaces.length === 0 && (includeHidden || !inst.hidden),
      );
      // Group workspaces by instance
      const grouped: Record<
        string,
        { instanceName: string; baseUrl: string; items: typeof flat }
      > = {};
      for (const item of flat) {
        if (!grouped[item.baseUrl]) {
          grouped[item.baseUrl] = {
            instanceName: item.instanceName,
            baseUrl: item.baseUrl,
            items: [],
          };
        }
        grouped[item.baseUrl].items.push(item);
      }
      // Recent workspaces (top 5 by lastOpened)
      const recents = flat
        .filter((item) => item.workspace.lastOpened)
        .sort(
          (a, b) =>
            new Date(b.workspace.lastOpened!).getTime() -
            new Date(a.workspace.lastOpened!).getTime(),
        )
        .slice(0, 5);
      return { grouped, unloaded, instances, recents };
    },
    [showHidden],
  );

  async function reloadFromBrowser() {
    if (!environment.canAccess(BrowserExtension)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Browser Extension Required",
        message: "Please install the Raycast Browser Extension",
      });
      return;
    }

    const tabs = await BrowserExtension.getTabs();
    const activeTab = tabs.find((tab) => tab.active);

    if (!activeTab) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No active browser tab found",
      });
      return;
    }

    const url = activeTab.url;
    const parsed = new URL(url);

    // Master instance page
    if (
      (parsed.host === "app.xano.com" || parsed.host === "app.dev.xano.com") &&
      parsed.pathname.startsWith("/instance")
    ) {
      const html = await BrowserExtension.getContent({ format: "html" });
      const instances = parseInstancesFromMasterHtml(html);

      if (instances.length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No instances found",
        });
        return;
      }

      await saveInstancesFromMaster(instances);
      await showToast({
        style: Toast.Style.Success,
        title: `Loaded ${instances.length} instances`,
      });
      revalidate();
      return;
    }

    // Individual instance workspace page
    if (!url.match(/\.(dev\.)?xano\.io/)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Not a Xano page",
        message: url,
      });
      return;
    }

    const path = parsed.pathname;
    if (!path.match(/^\/workspace\/?$/)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Navigate to the workspace list",
        message: "Go to the /workspace page or app.xano.com/instance",
      });
      return;
    }

    const html = await BrowserExtension.getContent({ format: "html" });
    const workspaces = parseWorkspacesFromHtml(html);

    if (workspaces.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No workspaces found",
      });
      return;
    }

    const baseUrl = extractBaseUrl(url);
    const instanceName = parseInstanceName(html);
    await saveInstanceWorkspaces(baseUrl, instanceName, workspaces);
    await showToast({
      style: Toast.Style.Success,
      title: `Loaded ${workspaces.length} workspaces from ${instanceName}`,
    });
    revalidate();
  }

  const grouped = data?.grouped ?? {};
  const unloaded = data?.unloaded ?? [];
  const instances = data?.instances ?? {};
  const recents = data?.recents ?? [];
  const hasItems = Object.keys(grouped).length > 0 || unloaded.length > 0;

  const toggleHiddenAction = (
    <Action
      title={showHidden ? "Hide Hidden Items" : "Show Hidden Items"}
      icon={showHidden ? Icon.EyeDisabled : Icon.Eye}
      shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
      onAction={() => setShowHidden(!showHidden)}
    />
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search workspaces...">
      {!hasItems && !isLoading ? (
        <List.EmptyView
          title="No Workspaces Loaded"
          description={
            "To get started:\n" +
            "1. Open app.xano.com/instance in your browser\n" +
            "2. Press \u2318R here to load your instances\n\n" +
            "Or navigate to an instance's /workspace page and press \u2318R to load its workspaces directly."
          }
        />
      ) : (
        <>
          {recents.length > 0 && (
            <List.Section title="Recent">
              {recents.map(
                ({ workspace, baseUrl, instanceName, lastAccessed }) => {
                  const workspaceUrl = `${baseUrl}/workspace/${workspace.id}/dashboard`;
                  const stale = isSessionStaleSync(lastAccessed);
                  const isDev = isDevInstance(baseUrl);
                  return (
                    <List.Item
                      key={`recent-${baseUrl}-${workspace.id}`}
                      title={workspace.alias || workspace.name}
                      subtitle={workspace.alias ? workspace.name : undefined}
                      keywords={
                        workspace.alias
                          ? [workspace.name, workspace.alias]
                          : undefined
                      }
                      icon={{
                        source: Icon.Circle,
                        tintColor: stale ? Color.Yellow : Color.Green,
                      }}
                      accessories={[
                        ...(workspace.hidden
                          ? [
                              {
                                tag: {
                                  value: "Hidden",
                                  color: Color.SecondaryText,
                                },
                              },
                            ]
                          : []),
                        ...(isDev
                          ? [{ tag: { value: "DEV", color: Color.Blue } }]
                          : []),
                        { tag: instanceName },
                        { text: `#${workspace.id}` },
                      ]}
                      actions={
                        <ActionPanel>
                          <ActionPanel.Section>
                            <Action
                              title="Open Workspace"
                              onAction={async () => {
                                const stale = await isSessionStale(baseUrl);
                                if (stale) {
                                  await open(getMasterUrl(baseUrl));
                                  await countdownToast(
                                    "Click your instance",
                                    8,
                                  );
                                }
                                await open(workspaceUrl);
                                await recordInstanceAccess(
                                  baseUrl,
                                  workspace.id,
                                );
                              }}
                            />
                            <Action.CopyToClipboard
                              title="Copy URL"
                              content={workspaceUrl}
                              shortcut={{
                                modifiers: ["cmd", "shift"],
                                key: "c",
                              }}
                            />
                          </ActionPanel.Section>
                          <ActionPanel.Section title="Manage">
                            <Action.Push
                              title="Set Alias"
                              icon={Icon.Pencil}
                              shortcut={{ modifiers: ["cmd"], key: "e" }}
                              target={
                                <SetAliasForm
                                  baseUrl={baseUrl}
                                  workspaceId={workspace.id}
                                  currentAlias={workspace.alias}
                                  onSaved={revalidate}
                                />
                              }
                            />
                            <Action
                              title={
                                workspace.hidden
                                  ? "Show Workspace"
                                  : "Hide Workspace"
                              }
                              icon={
                                workspace.hidden ? Icon.Eye : Icon.EyeDisabled
                              }
                              shortcut={{ modifiers: ["cmd"], key: "h" }}
                              onAction={async () => {
                                await toggleWorkspaceHidden(
                                  baseUrl,
                                  workspace.id,
                                );
                                revalidate();
                              }}
                            />
                            {toggleHiddenAction}
                            <Action
                              title="Reload from Browser"
                              icon={Icon.RotateClockwise}
                              shortcut={{ modifiers: ["cmd"], key: "r" }}
                              onAction={reloadFromBrowser}
                            />
                          </ActionPanel.Section>
                        </ActionPanel>
                      }
                    />
                  );
                },
              )}
            </List.Section>
          )}
          {Object.entries(grouped).map(([baseUrl, { instanceName, items }]) => {
            const instance = instances[baseUrl];
            const allWorkspacesHidden =
              instance?.workspaces.length > 0 &&
              instance.workspaces.every((w) => w.hidden);
            const isDev = isDevInstance(baseUrl);
            return (
              <List.Section
                key={baseUrl}
                title={isDev ? `${instanceName} [DEV]` : instanceName}
              >
                {items.map(({ workspace, lastAccessed }) => {
                  const workspaceUrl = `${baseUrl}/workspace/${workspace.id}/dashboard`;
                  const stale = isSessionStaleSync(lastAccessed);
                  return (
                    <List.Item
                      key={`${baseUrl}-${workspace.id}`}
                      title={workspace.name}
                      subtitle={workspace.alias || undefined}
                      keywords={[
                        workspace.id,
                        ...(workspace.alias ? [workspace.alias] : []),
                      ]}
                      icon={{
                        source: Icon.Circle,
                        tintColor: workspace.hidden
                          ? Color.SecondaryText
                          : stale
                            ? Color.Yellow
                            : Color.Green,
                      }}
                      accessories={[
                        ...(workspace.hidden
                          ? [
                              {
                                tag: {
                                  value: "Hidden",
                                  color: Color.SecondaryText,
                                },
                              },
                            ]
                          : []),
                        ...(isDev
                          ? [{ tag: { value: "DEV", color: Color.Blue } }]
                          : []),
                        { text: `#${workspace.id}` },
                      ]}
                      actions={
                        <ActionPanel>
                          <ActionPanel.Section>
                            <Action
                              title="Open Workspace"
                              onAction={async () => {
                                const stale = await isSessionStale(baseUrl);
                                if (stale) {
                                  await open(getMasterUrl(baseUrl));
                                  await countdownToast(
                                    "Click your instance",
                                    8,
                                  );
                                }
                                await open(workspaceUrl);
                                await recordInstanceAccess(
                                  baseUrl,
                                  workspace.id,
                                );
                              }}
                            />
                            <Action.CopyToClipboard
                              title="Copy URL"
                              content={workspaceUrl}
                              shortcut={{
                                modifiers: ["cmd", "shift"],
                                key: "c",
                              }}
                            />
                          </ActionPanel.Section>
                          <ActionPanel.Section title="Manage">
                            <Action.Push
                              title="Set Alias"
                              icon={Icon.Pencil}
                              shortcut={{ modifiers: ["cmd"], key: "e" }}
                              target={
                                <SetAliasForm
                                  baseUrl={baseUrl}
                                  workspaceId={workspace.id}
                                  currentAlias={workspace.alias}
                                  onSaved={revalidate}
                                />
                              }
                            />
                            <Action
                              title={
                                workspace.hidden
                                  ? "Show Workspace"
                                  : "Hide Workspace"
                              }
                              icon={
                                workspace.hidden ? Icon.Eye : Icon.EyeDisabled
                              }
                              shortcut={{ modifiers: ["cmd"], key: "h" }}
                              onAction={async () => {
                                await toggleWorkspaceHidden(
                                  baseUrl,
                                  workspace.id,
                                );
                                revalidate();
                              }}
                            />
                            <Action
                              title={
                                instance?.hidden
                                  ? "Show Instance"
                                  : "Hide Instance"
                              }
                              icon={
                                instance?.hidden ? Icon.Eye : Icon.EyeDisabled
                              }
                              shortcut={{
                                modifiers: ["cmd", "shift"],
                                key: "h",
                              }}
                              onAction={async () => {
                                await toggleInstanceHidden(baseUrl);
                                revalidate();
                              }}
                            />
                            <Action
                              title={
                                allWorkspacesHidden
                                  ? "Show All Workspaces"
                                  : "Hide Other Workspaces"
                              }
                              icon={
                                allWorkspacesHidden
                                  ? Icon.Eye
                                  : Icon.EyeDisabled
                              }
                              shortcut={{ modifiers: ["cmd", "opt"], key: "h" }}
                              onAction={async () => {
                                await setAllWorkspacesHidden(
                                  baseUrl,
                                  !allWorkspacesHidden,
                                  allWorkspacesHidden
                                    ? undefined
                                    : workspace.id,
                                );
                                revalidate();
                              }}
                            />
                            {toggleHiddenAction}
                            <Action
                              title="Reload from Browser"
                              icon={Icon.RotateClockwise}
                              shortcut={{ modifiers: ["cmd"], key: "r" }}
                              onAction={reloadFromBrowser}
                            />
                            <Action
                              title="Remove Instance"
                              icon={Icon.Trash}
                              style={Action.Style.Destructive}
                              shortcut={{
                                modifiers: ["cmd"],
                                key: "backspace",
                              }}
                              onAction={async () => {
                                if (
                                  await confirmAlert({
                                    title: "Remove Instance",
                                    message: `Remove "${instanceName}" and all its workspaces?`,
                                    primaryAction: {
                                      title: "Remove",
                                      style: Alert.ActionStyle.Destructive,
                                    },
                                  })
                                ) {
                                  await removeInstance(baseUrl);
                                  revalidate();
                                }
                              }}
                            />
                          </ActionPanel.Section>
                        </ActionPanel>
                      }
                    />
                  );
                })}
              </List.Section>
            );
          })}
          {unloaded.length > 0 && (
            <List.Section title="Instances (workspaces not loaded)">
              {unloaded.map((instance) => {
                const isDev = isDevInstance(instance.baseUrl);
                return (
                  <List.Item
                    key={instance.baseUrl}
                    title={instance.name}
                    icon={{ source: Icon.Circle, tintColor: Color.Yellow }}
                    accessories={[
                      ...(isDev
                        ? [{ tag: { value: "DEV", color: Color.Blue } }]
                        : []),
                      { tag: "No workspaces loaded" },
                      { text: new URL(instance.baseUrl).host },
                    ]}
                    actions={
                      <ActionPanel>
                        <ActionPanel.Section>
                          <Action
                            title="Open Instance"
                            onAction={async () => {
                              try {
                                if (!environment.canAccess(BrowserExtension)) {
                                  await open(`${instance.baseUrl}/workspace`);
                                  return;
                                }

                                await open(getMasterUrl(instance.baseUrl));
                                await countdownToast(
                                  "Click your instance, then wait for workspace page",
                                  8,
                                );

                                const result =
                                  await scrapeWorkspacesFromBrowser(
                                    instance.baseUrl,
                                  );

                                if (!result) {
                                  await showToast({
                                    style: Toast.Style.Failure,
                                    title: "No workspace page found",
                                    message:
                                      "Make sure you're on a .xano.io/workspace page, then try Reload (⌘R)",
                                  });
                                  return;
                                }

                                const workspaces = parseWorkspacesFromHtml(
                                  result.html,
                                );

                                if (workspaces.length === 0) {
                                  await showToast({
                                    style: Toast.Style.Failure,
                                    title: "No workspaces found",
                                    message:
                                      "Page may still be loading — try Reload (⌘R)",
                                  });
                                  return;
                                }

                                const instanceName = parseInstanceName(
                                  result.html,
                                );
                                await saveInstanceWorkspaces(
                                  result.baseUrl,
                                  instanceName,
                                  workspaces,
                                );
                                await recordInstanceAccess(result.baseUrl);
                                await showToast({
                                  style: Toast.Style.Success,
                                  title: `Loaded ${workspaces.length} workspaces from ${instanceName}`,
                                });
                                revalidate();
                              } catch (error) {
                                await showToast({
                                  style: Toast.Style.Failure,
                                  title: "Error",
                                  message: String(error),
                                });
                              }
                            }}
                          />
                        </ActionPanel.Section>
                        <ActionPanel.Section title="Manage">
                          {toggleHiddenAction}
                          <Action
                            title="Reload from Browser"
                            icon={Icon.RotateClockwise}
                            shortcut={{ modifiers: ["cmd"], key: "r" }}
                            onAction={reloadFromBrowser}
                          />
                          <Action
                            title="Remove Instance"
                            icon={Icon.Trash}
                            style={Action.Style.Destructive}
                            shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                            onAction={async () => {
                              if (
                                await confirmAlert({
                                  title: "Remove Instance",
                                  message: `Remove "${instance.name}" and all its workspaces?`,
                                  primaryAction: {
                                    title: "Remove",
                                    style: Alert.ActionStyle.Destructive,
                                  },
                                })
                              ) {
                                await removeInstance(instance.baseUrl);
                                revalidate();
                              }
                            }}
                          />
                        </ActionPanel.Section>
                      </ActionPanel>
                    }
                  />
                );
              })}
            </List.Section>
          )}
          <List.Section title="Settings">
            <List.Item
              key="actions-hint"
              title="Actions"
              subtitle="Press ⌘K to show more options when selecting a workspace"
              icon={Icon.Info}
            />
            <List.Item
              key="load-from-tab"
              title="Load Workspaces from Current Tab"
              icon={Icon.Globe}
              actions={
                <ActionPanel>
                  <Action
                    title="Load Workspaces from Current Tab"
                    icon={Icon.Globe}
                    onAction={async () => {
                      if (!environment.canAccess(BrowserExtension)) {
                        await showToast({
                          style: Toast.Style.Failure,
                          title: "Browser Extension Required",
                          message:
                            "Please install the Raycast Browser Extension",
                        });
                        return;
                      }

                      const tabs = await BrowserExtension.getTabs();
                      const activeTab = tabs.find((t) => t.active);
                      if (!activeTab) {
                        await showToast({
                          style: Toast.Style.Failure,
                          title: "No active browser tab found",
                        });
                        return;
                      }

                      const url = activeTab.url;
                      if (!url.match(/\.(dev\.)?xano\.io/)) {
                        await showToast({
                          style: Toast.Style.Failure,
                          title: "Not a Xano instance page",
                          message: url,
                        });
                        return;
                      }

                      const html = await BrowserExtension.getContent({
                        format: "html",
                        tabId: activeTab.id,
                      });
                      const baseUrl = extractBaseUrl(url);
                      const workspaces = parseWorkspacesFromHtml(html);

                      if (workspaces.length === 0) {
                        await showToast({
                          style: Toast.Style.Failure,
                          title: "No workspaces found",
                          message: "Make sure you're on the /workspace page",
                        });
                        return;
                      }

                      const instanceName = parseInstanceName(html);
                      await saveInstanceWorkspaces(
                        baseUrl,
                        instanceName,
                        workspaces,
                      );
                      await recordInstanceAccess(baseUrl);
                      await showToast({
                        style: Toast.Style.Success,
                        title: `Loaded ${workspaces.length} workspaces from ${instanceName}`,
                      });
                      revalidate();
                    }}
                  />
                </ActionPanel>
              }
            />
            <List.Item
              key="load-instances-from-tab"
              title="Load Instances from Current Tab"
              icon={Icon.Globe}
              actions={
                <ActionPanel>
                  <Action
                    title="Load Instances from Current Tab"
                    icon={Icon.Globe}
                    onAction={async () => {
                      if (!environment.canAccess(BrowserExtension)) {
                        await showToast({
                          style: Toast.Style.Failure,
                          title: "Browser Extension Required",
                          message:
                            "Please install the Raycast Browser Extension",
                        });
                        return;
                      }

                      const tabs = await BrowserExtension.getTabs();
                      const activeTab = tabs.find((t) => t.active);
                      if (!activeTab) {
                        await showToast({
                          style: Toast.Style.Failure,
                          title: "No active browser tab found",
                        });
                        return;
                      }

                      const url = activeTab.url;
                      const parsed = new URL(url);
                      if (
                        !(
                          parsed.host === "app.xano.com" ||
                          parsed.host === "app.dev.xano.com"
                        ) ||
                        !parsed.pathname.startsWith("/instance")
                      ) {
                        await showToast({
                          style: Toast.Style.Failure,
                          title: "Not a Xano instances page",
                          message: "Navigate to app.xano.com/instance first",
                        });
                        return;
                      }

                      const html = await BrowserExtension.getContent({
                        format: "html",
                        tabId: activeTab.id,
                      });
                      const newInstances = parseInstancesFromMasterHtml(html);

                      if (newInstances.length === 0) {
                        await showToast({
                          style: Toast.Style.Failure,
                          title: "No instances found",
                        });
                        return;
                      }

                      await saveInstancesFromMaster(newInstances);
                      await showToast({
                        style: Toast.Style.Success,
                        title: `Loaded ${newInstances.length} instances`,
                      });
                      revalidate();
                    }}
                  />
                </ActionPanel>
              }
            />
            <List.Item
              key="add-workspace-from-tab"
              title="Add Current Workspace from Tab"
              icon={Icon.Plus}
              actions={
                <ActionPanel>
                  <Action
                    title="Add Current Workspace from Tab"
                    icon={Icon.Plus}
                    onAction={async () => {
                      if (!environment.canAccess(BrowserExtension)) {
                        await showToast({
                          style: Toast.Style.Failure,
                          title: "Browser Extension Required",
                          message:
                            "Please install the Raycast Browser Extension",
                        });
                        return;
                      }

                      const tabs = await BrowserExtension.getTabs();
                      const activeTab = tabs.find((t) => t.active);
                      if (!activeTab) {
                        await showToast({
                          style: Toast.Style.Failure,
                          title: "No active browser tab found",
                        });
                        return;
                      }

                      const url = activeTab.url;
                      if (!url.match(/\.(dev\.)?xano\.io/)) {
                        await showToast({
                          style: Toast.Style.Failure,
                          title: "Not a Xano workspace page",
                          message: url,
                        });
                        return;
                      }

                      const workspaceId = parseWorkspaceIdFromUrl(url);
                      if (!workspaceId) {
                        await showToast({
                          style: Toast.Style.Failure,
                          title: "No workspace ID found in URL",
                          message: "Navigate to a workspace page first",
                        });
                        return;
                      }

                      const html = await BrowserExtension.getContent({
                        format: "html",
                        tabId: activeTab.id,
                      });
                      const workspaceName =
                        parseWorkspaceNameFromPage(html) ?? "Unknown Workspace";
                      const baseUrl = extractBaseUrl(url);

                      // If instance already exists, add directly
                      const allInstances = await getAllInstances();
                      if (allInstances[baseUrl]) {
                        await addWorkspaceToInstance(
                          baseUrl,
                          allInstances[baseUrl].name,
                          { id: workspaceId, name: workspaceName },
                        );
                        await recordInstanceAccess(baseUrl, workspaceId);
                        await showToast({
                          style: Toast.Style.Success,
                          title: `Added "${workspaceName}" to ${allInstances[baseUrl].name}`,
                        });
                        revalidate();
                        return;
                      }

                      // Otherwise, need to ask for instance name
                      push(
                        <AddWorkspaceForm
                          baseUrl={baseUrl}
                          workspaceId={workspaceId}
                          workspaceName={workspaceName}
                          onSaved={revalidate}
                        />,
                      );
                    }}
                  />
                </ActionPanel>
              }
            />
          </List.Section>
        </>
      )}
    </List>
  );
}
