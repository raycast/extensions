import { Action, ActionPanel, Alert, Icon, List, Toast, confirmAlert, showToast } from "@raycast/api";
import { useCallback, useMemo, useState } from "react";
import { AppFreezerNotInstalledError, performAction } from "./appfreezer";
import { ApplicationSortDropdown, ApplicationSortMode, applicationAccessories } from "./application-presentation";
import { sortApplications } from "./application-sort";
import { readableError } from "./errors";
import { AppFreezerApplication } from "./protocol";
import { useAgentSnapshot } from "./use-agent-snapshot";

export type ApplicationCommandMode = "quit" | "force-quit";

interface CommandDefinition {
  emptyTitle: string;
  emptyDescription: string;
  verb: string;
  action: "quit" | "force-quit";
  icon: Icon;
  destructive: boolean;
}

const definitions: Record<ApplicationCommandMode, CommandDefinition> = {
  quit: {
    emptyTitle: "No Apps Can Be Quit",
    emptyDescription: "App Freezer did not report any applications that accept Quit requests.",
    verb: "Quit",
    action: "quit",
    icon: Icon.XMarkCircle,
    destructive: true,
  },
  "force-quit": {
    emptyTitle: "No Apps Can Be Force Quit",
    emptyDescription: "App Freezer did not report any applications that can be force quit.",
    verb: "Force Quit",
    action: "force-quit",
    icon: Icon.Trash,
    destructive: true,
  },
};

function applicationsForMode(
  applications: AppFreezerApplication[],
  sortMode: ApplicationSortMode,
): AppFreezerApplication[] {
  return sortApplications(
    applications.filter((application) => application.canQuit),
    sortMode,
  );
}

export function ApplicationCommand({ mode }: { mode: ApplicationCommandMode }) {
  const definition = definitions[mode];
  const { snapshot, error, isLoading, revalidate, applySnapshot } = useAgentSnapshot();
  const [sortMode, setSortMode] = useState<ApplicationSortMode>("name");

  const applications = useMemo(() => applicationsForMode(snapshot?.applications ?? [], sortMode), [snapshot, sortMode]);

  const run = useCallback(
    async (application: AppFreezerApplication) => {
      if (definition.destructive) {
        const pausedNote = application.status === "paused" ? " It is currently paused." : "";
        const message =
          mode === "force-quit"
            ? `Unsaved changes in ${application.name} will be lost.${pausedNote}`
            : `${application.name} will receive a normal Quit request.${pausedNote}`;
        const confirmed = await confirmAlert({
          title: `${definition.verb} ${application.name}?`,
          message,
          primaryAction: { title: definition.verb, style: Alert.ActionStyle.Destructive },
        });
        if (!confirmed) return;
      }

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: `${definition.verb} ${application.name}…`,
      });
      try {
        await applySnapshot(performAction(definition.action, application.id));
        toast.style = Toast.Style.Success;
        toast.title = `${definition.verb} completed for ${application.name}`;
      } catch (caught) {
        toast.style = Toast.Style.Failure;
        toast.title = `${definition.verb} failed for ${application.name}`;
        toast.message = readableError(caught);
      }
    },
    [applySnapshot, definition, mode],
  );

  if (error) {
    return (
      <List isLoading={isLoading}>
        <List.EmptyView
          icon={error instanceof AppFreezerNotInstalledError ? Icon.Download : Icon.Warning}
          title={error instanceof AppFreezerNotInstalledError ? "App Freezer Is Not Installed" : "Could Not Load Apps"}
          description={readableError(error)}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`${definition.verb} an app…`}
      searchBarAccessory={<ApplicationSortDropdown value={sortMode} onChange={setSortMode} />}
    >
      {applications.map((application) => (
        <List.Item
          key={application.id}
          id={application.id}
          title={application.name}
          icon={application.bundlePath ? { fileIcon: application.bundlePath } : Icon.AppWindow}
          keywords={[application.bundleIdentifier ?? "", application.bundlePath ?? ""]}
          accessories={applicationAccessories(application)}
          actions={
            <ActionPanel>
              <Action
                title={`${definition.verb} ${application.name}`}
                icon={definition.icon}
                style={definition.destructive ? Action.Style.Destructive : Action.Style.Regular}
                onAction={() => run(application)}
              />
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ))}
      {!isLoading && applications.length === 0 ? (
        <List.EmptyView
          icon={definition.icon}
          title={definition.emptyTitle}
          description={definition.emptyDescription}
          actions={
            <ActionPanel>
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : null}
    </List>
  );
}
