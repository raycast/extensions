import { Action, ActionPanel, Alert, confirmAlert, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { useMemo, useState } from "react";
import { gib, groupByStatus, Instance, statusIcon, summarize, volumeNames } from "../lib/instance";
import { deleteInstance, listInstances, openShell, restartInstance, startInstance, stopInstance } from "../lib/lima";
import { listManifests } from "../lib/manifests";
import { useTasks } from "../lib/tasks";
import { CreateInstanceForm } from "./create-instance-form";
import { ErrorView } from "./error-view";
import { ExtensionActions } from "./extension-actions";
import { InstanceActions } from "./instance-actions";
import { InstanceDetail } from "./instance-detail";
import { ManifestForm } from "./manifest-form";
import { ManifestList } from "./manifest-list";

type StatusFilter = "all" | "Running" | "Stopped";

/** What deleting takes with it, and what it leaves: volumes outlive instances. */
function deleteMessage(instance: Instance): string {
  const volumes = volumeNames(instance);
  const kept = volumes.length
    ? ` Its ${volumes.length === 1 ? "volume" : "volumes"} ${volumes.join(" and ")} ${volumes.length === 1 ? "stays" : "stay"}, data and all.`
    : "";
  return `Its disk and everything on it are deleted too. This can't be undone.${kept}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function InstanceList() {
  const {
    data: instances,
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(listInstances, [], {
    // Shown in the empty view when there's nothing else to show, and as a toast over older results.
    onError(error) {
      if (instances?.length) {
        showToast({ style: Toast.Style.Failure, title: "Couldn't load instances", message: error.message });
      }
    },
  });
  // For the Manifest row and ⌘N. A folder that can't be read just has none.
  const { data: manifests, revalidate: revalidateManifests } = useCachedPromise(listManifests, [], {
    onError: () => undefined,
  });
  const [filter, setFilter] = useCachedState<StatusFilter>("instances:status", "all");
  // Starts and stops take a while, so the row says what's happening until limactl returns.
  const { pending, run, busy } = useTasks(revalidate);
  // Selects an instance created from here once it's in the list.
  const [focusId, setFocusId] = useState<string>();

  const shown = useMemo(
    () => (instances ?? []).filter((instance) => filter === "all" || instance.status === filter),
    [instances, filter],
  );

  function created(name: string) {
    setFocusId(name);
    revalidate();
    revalidateManifests();
  }

  async function shell(instance: Instance) {
    try {
      await openShell(instance.name);
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Couldn't open a shell", message: errorMessage(error) });
    }
  }

  async function remove(instance: Instance) {
    const confirmed = await confirmAlert({
      title: `Delete ${instance.name}?`,
      message: deleteMessage(instance),
      icon: Icon.Trash,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (confirmed) await run(instance.name, "Deleting", () => deleteInstance(instance.name), "Deleted");
  }

  // From a template, or from a manifest not run yet. The form shows what will be made before it's made.
  const notRun = (manifests ?? []).filter((manifest) => !manifest.instance && !manifest.error);
  const createAction = (
    <ActionPanel.Submenu title="Create Instance" icon={Icon.Plus} shortcut={Keyboard.Shortcut.Common.New}>
      <Action.Push
        title="From Template…"
        icon={Icon.AppWindowGrid2x2}
        target={<CreateInstanceForm onCreated={created} />}
      />
      <ActionPanel.Section title="From Manifest">
        {notRun.map((manifest) => (
          <Action.Push
            key={manifest.path}
            title={manifest.file}
            icon={Icon.Document}
            target={<ManifestForm path={manifest.path} onRan={created} />}
          />
        ))}
        <Action.Push title="All Manifests…" icon={Icon.List} target={<ManifestList />} />
      </ActionPanel.Section>
    </ActionPanel.Submenu>
  );
  const refreshAction = (
    <Action
      title="Refresh"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={revalidate}
    />
  );

  const filterTitle = filter === "all" ? undefined : filter;
  const title = [instances ? summarize(instances) : undefined, filterTitle].filter(Boolean).join(" · ");

  return (
    <List
      isLoading={isLoading || busy}
      isShowingDetail={shown.length > 0}
      navigationTitle={title || undefined}
      selectedItemId={focusId}
      searchBarPlaceholder="Search by name"
      searchBarAccessory={
        <List.Dropdown tooltip="Status" value={filter} onChange={(value) => setFilter(value as StatusFilter)}>
          <List.Dropdown.Item title="All Instances" value="all" icon={Icon.AppWindowList} />
          <List.Dropdown.Item title="Running" value="Running" icon={statusIcon("Running")} />
          <List.Dropdown.Item title="Stopped" value="Stopped" icon={statusIcon("Stopped")} />
        </List.Dropdown>
      }
    >
      {error && !instances ? (
        <ErrorView error={error} title="Couldn't Load Instances" onRetry={revalidate} />
      ) : (
        <List.EmptyView
          icon={Icon.ComputerChip}
          title={instances?.length ? `No ${filter} Instances` : "No Instances"}
          description={
            instances?.length ? "Try another status." : "Press ⌘N to create one from a template or a manifest."
          }
          actions={
            <ActionPanel>
              {createAction}
              {refreshAction}
              <ExtensionActions />
            </ActionPanel>
          }
        />
      )}
      {groupByStatus(shown, (instance) => instance.status).map(({ status, items }) => (
        <List.Section key={status} title={status} subtitle={String(items.length)}>
          {items.map((instance) => {
            const state = pending[instance.name];
            const manifest = manifests?.find((entry) => entry.instance?.name === instance.name);
            return (
              <List.Item
                key={instance.name}
                id={instance.name}
                icon={{ value: statusIcon(instance.status, state), tooltip: state ? `${state}...` : instance.status }}
                title={instance.name}
                keywords={[instance.config?.os, instance.arch, instance.vmType].filter(
                  (word): word is string => !!word,
                )}
                accessories={[
                  {
                    text: `${instance.cpus} CPU · ${gib(instance.memory)}`,
                    tooltip: `${instance.cpus} CPUs, ${gib(instance.memory)} memory`,
                  },
                ]}
                detail={<InstanceDetail instance={instance} pending={state} manifest={manifest?.file} />}
                actions={
                  <InstanceActions
                    instance={instance}
                    pending={state}
                    createAction={createAction}
                    onOpenShell={() => shell(instance)}
                    onStart={async (thenOpenShell) => {
                      const started = await run(
                        instance.name,
                        "Starting",
                        () => startInstance(instance.name),
                        "Started",
                      );
                      if (started && thenOpenShell) await shell(instance);
                    }}
                    onStop={() => run(instance.name, "Stopping", () => stopInstance(instance.name), "Stopped")}
                    onRestart={() =>
                      run(instance.name, "Restarting", () => restartInstance(instance.name), "Restarted")
                    }
                    onDelete={() => remove(instance)}
                    onRefresh={revalidate}
                  />
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}
