import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { ReactNode, useState } from "react";
import { groupByStatus, isRunning, Pending, statusIcon, tildify } from "../lib/instance";
import { createInstance, deleteInstance, openShell, startInstance } from "../lib/lima";
import { listManifests, Manifest, manifestsFolder, manifestStatus } from "../lib/manifests";
import { useTasks } from "../lib/tasks";
import { ErrorView } from "./error-view";
import { ExtensionActions, PreferencesAction } from "./extension-actions";
import { LogsView } from "./logs-view";
import { ManifestDetail } from "./manifest-detail";
import { ManifestForm } from "./manifest-form";
import { NewManifestForm } from "./new-manifest-form";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** "4 Manifests · ~/lima". */
function summarize(count: number, folder: string): string {
  return `${count} ${count === 1 ? "Manifest" : "Manifests"} · ${folder}`;
}

/** Your own lima.yaml files, one row each, with the instance each one makes. */
export function ManifestList() {
  const folder = tildify(manifestsFolder());
  const {
    data: manifests,
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(listManifests, [], {
    onError(error) {
      if (manifests?.length) {
        showToast({ style: Toast.Style.Failure, title: "Couldn't load manifests", message: error.message });
      }
    },
  });
  const { pending, run, busy } = useTasks(revalidate);
  // Selects a manifest made or run from here once it's in the list.
  const [focusId, setFocusId] = useState<string>();

  function focus(name: string) {
    setFocusId(name);
    revalidate();
  }

  async function shell(name: string) {
    try {
      await openShell(name);
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Couldn't open a shell", message: errorMessage(error) });
    }
  }

  function runManifest(manifest: Manifest) {
    return run(
      manifest.name,
      "Creating",
      async () => {
        await createInstance({ name: manifest.name, source: manifest.path });
        await startInstance(manifest.name);
      },
      "Started",
      "Creating, then starting. The first start downloads the image.",
    );
  }

  async function recreate(manifest: Manifest) {
    const confirmed = await confirmAlert({
      title: `Recreate ${manifest.name}?`,
      message: `${manifest.file} changed after ${manifest.name} was made. Recreating deletes ${manifest.name}, disk and all, then creates it again from the file.`,
      icon: Icon.RotateClockwise,
      primaryAction: { title: "Recreate", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await run(
      manifest.name,
      "Recreating",
      async () => {
        await deleteInstance(manifest.name);
        await createInstance({ name: manifest.name, source: manifest.path });
        await startInstance(manifest.name);
      },
      "Recreated",
    );
  }

  const newAction = (
    <Action.Push
      title="New Manifest"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<NewManifestForm onCreated={focus} />}
    />
  );
  const runFileAction = (
    <Action.Push
      title="Run File…"
      icon={Icon.Document}
      shortcut={{ modifiers: ["opt", "cmd"], key: "o" }}
      target={<ManifestForm onRan={revalidate} />}
    />
  );
  const refreshAction = (
    <Action
      title="Refresh"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={revalidate}
    />
  );

  /** ↵ and ⌘↵ follow the manifest's state, like Instances. While something runs, ↵ only refreshes. */
  function primaryActions(manifest: Manifest, state?: Pending): ReactNode {
    if (state) return refreshAction;
    if (manifest.error) return <Action.Open title="Edit Manifest" icon={Icon.Pencil} target={manifest.path} />;
    const withChanges = (
      <Action.Push
        title="Run with Changes…"
        icon={Icon.Switch}
        target={<ManifestForm path={manifest.path} onRan={focus} />}
      />
    );
    const instance = manifest.instance;
    if (!instance) {
      return (
        <>
          <Action title="Run" icon={Icon.Play} onAction={() => runManifest(manifest)} />
          {withChanges}
        </>
      );
    }
    if (isRunning(instance)) {
      return (
        <>
          <Action title="Open Shell" icon={Icon.Terminal} onAction={() => shell(manifest.name)} />
          {withChanges}
        </>
      );
    }
    return (
      <>
        <Action
          title="Start"
          icon={Icon.Play}
          onAction={() => run(manifest.name, "Starting", () => startInstance(manifest.name), "Started")}
        />
        {withChanges}
      </>
    );
  }

  return (
    <List
      isLoading={isLoading || busy}
      isShowingDetail={!!manifests?.length}
      navigationTitle={manifests ? summarize(manifests.length, folder) : undefined}
      selectedItemId={focusId}
      searchBarPlaceholder="Search manifests"
    >
      {error && !manifests ? (
        <ErrorView error={error} title="Couldn't Load Manifests" onRetry={revalidate} />
      ) : (
        <List.EmptyView
          icon={Icon.Document}
          title={`No Manifests in ${folder}`}
          description="A manifest is a lima.yaml of your own. Press ↵ to start one from a template, or set Manifests Folder in the preferences."
          actions={
            <ActionPanel>
              {newAction}
              {runFileAction}
              {refreshAction}
              <PreferencesAction />
              <ExtensionActions preferences={false} />
            </ActionPanel>
          }
        />
      )}
      {groupByStatus(manifests ?? [], manifestStatus).map(({ status, items }) => (
        <List.Section key={status} title={status} subtitle={String(items.length)}>
          {items.map((manifest) => {
            const state = pending[manifest.name];
            const base = manifest.content?.base[0]?.replace(/^template:/, "");
            return (
              <List.Item
                key={manifest.path}
                id={manifest.name}
                icon={{ value: statusIcon(status, state), tooltip: state ? `${state}...` : status }}
                title={manifest.file}
                keywords={[manifest.name, ...(manifest.content?.base ?? [])]}
                accessories={[
                  ...(manifest.error
                    ? [{ icon: { source: Icon.Warning, tintColor: Color.Red }, tooltip: manifest.error }]
                    : []),
                  ...(manifest.changed
                    ? [{ tag: { value: "Changed", color: Color.Orange }, tooltip: "Saved after its instance was made" }]
                    : []),
                  ...(base ? [{ text: base, tooltip: `Builds on ${manifest.content?.base.join(", ")}` }] : []),
                ]}
                detail={<ManifestDetail manifest={manifest} pending={state} />}
                actions={
                  <ActionPanel title={manifest.file}>
                    <ActionPanel.Section>{primaryActions(manifest, state)}</ActionPanel.Section>
                    {manifest.changed && !state && (
                      <ActionPanel.Section>
                        <Action
                          title="Recreate from Manifest"
                          icon={Icon.RotateClockwise}
                          style={Action.Style.Destructive}
                          shortcut={{ modifiers: ["ctrl", "shift"], key: "r" }}
                          onAction={() => recreate(manifest)}
                        />
                      </ActionPanel.Section>
                    )}
                    <ActionPanel.Section>
                      {manifest.instance && (
                        <Action.Push
                          title="Show Logs"
                          icon={Icon.Document}
                          shortcut={{ modifiers: ["cmd"], key: "l" }}
                          target={<LogsView name={manifest.name} />}
                        />
                      )}
                      {!manifest.error && (
                        <Action.Open
                          title="Edit Manifest"
                          icon={Icon.Pencil}
                          target={manifest.path}
                          shortcut={Keyboard.Shortcut.Common.Edit}
                        />
                      )}
                      <Action.ShowInFinder path={manifest.path} shortcut={{ modifiers: ["cmd", "shift"], key: "f" }} />
                      <Action.CopyToClipboard
                        title="Copy Path"
                        content={manifest.path}
                        shortcut={Keyboard.Shortcut.Common.CopyPath}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                      {newAction}
                      {runFileAction}
                      {!state && refreshAction}
                    </ActionPanel.Section>
                    <ExtensionActions />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}
