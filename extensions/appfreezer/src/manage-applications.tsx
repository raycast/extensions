import { Action, ActionPanel, Alert, Icon, Keyboard, List, Toast, confirmAlert, showToast } from "@raycast/api";
import { useCallback, useMemo, useState } from "react";
import { AppFreezerNotInstalledError, openSettings, performAction } from "./appfreezer";
import { ApplicationSortDropdown, ApplicationSortMode, applicationAccessories } from "./application-presentation";
import { sortApplications } from "./application-sort";
import { readableError } from "./errors";
import { AppFreezerApplication } from "./protocol";
import { useAgentSnapshot } from "./use-agent-snapshot";

function capability(application: AppFreezerApplication): { enabled: boolean; reason?: string } {
  const isPaused = application.status === "paused";
  const enabled = isPaused || application.canPause;
  return {
    enabled,
    reason: enabled ? undefined : "Pause is unavailable for this application.",
  };
}

function ApplicationActions({
  application,
  runAction,
  quitApplication,
  refresh,
  resumeAll,
}: {
  application: AppFreezerApplication;
  runAction: (application: AppFreezerApplication) => Promise<void>;
  quitApplication: (application: AppFreezerApplication) => Promise<void>;
  refresh: () => void;
  resumeAll: () => Promise<void>;
}) {
  const isPaused = application.status === "paused";
  const canAct = capability(application);
  return (
    <ActionPanel>
      <ActionPanel.Section>
        {canAct.enabled ? (
          <Action
            title={isPaused ? "Resume Application" : "Pause Application"}
            icon={isPaused ? Icon.Play : Icon.Pause}
            onAction={() => runAction(application)}
          />
        ) : null}
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={refresh}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Resume All Applications"
          icon={Icon.Play}
          shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
          onAction={async () => {
            if (
              await confirmAlert({
                title: "Resume All Applications?",
                message: "Every application paused by App Freezer will resume.",
              })
            ) {
              const toast = await showToast({ style: Toast.Style.Animated, title: "Resuming applications…" });
              try {
                await resumeAll();
                toast.style = Toast.Style.Success;
                toast.title = "Resumed all applications";
              } catch (caught) {
                toast.style = Toast.Style.Failure;
                toast.title = "Could not resume all applications";
                toast.message = readableError(caught);
              }
            }
          }}
        />
        <Action title="Open App Freezer Settings" icon={Icon.Gear} onAction={openSettings} />
      </ActionPanel.Section>
      {application.canQuit ? (
        <ActionPanel.Section>
          <Action
            title={`Quit ${application.name}`}
            icon={Icon.XMarkCircle}
            style={Action.Style.Destructive}
            onAction={() => quitApplication(application)}
          />
        </ActionPanel.Section>
      ) : null}
    </ActionPanel>
  );
}

function ApplicationItem({
  application,
  runAction,
  quitApplication,
  refresh,
  resumeAll,
}: {
  application: AppFreezerApplication;
  runAction: (application: AppFreezerApplication) => Promise<void>;
  quitApplication: (application: AppFreezerApplication) => Promise<void>;
  refresh: () => void;
  resumeAll: () => Promise<void>;
}) {
  const canAct = capability(application);
  return (
    <List.Item
      id={application.id}
      title={application.name}
      subtitle={canAct.reason}
      icon={application.bundlePath ? { fileIcon: application.bundlePath } : Icon.AppWindow}
      keywords={[application.bundleIdentifier || "", application.bundlePath || ""]}
      accessories={applicationAccessories(application)}
      actions={
        <ApplicationActions
          application={application}
          runAction={runAction}
          quitApplication={quitApplication}
          refresh={refresh}
          resumeAll={resumeAll}
        />
      }
    />
  );
}

export default function ManageApplications() {
  const { snapshot, error, isLoading, revalidate, applySnapshot } = useAgentSnapshot();
  const [sortMode, setSortMode] = useState<ApplicationSortMode>("name");

  const runAction = useCallback(
    async (application: AppFreezerApplication) => {
      const verb = application.status === "paused" ? "Resuming" : "Pausing";
      const toast = await showToast({ style: Toast.Style.Animated, title: `${verb} ${application.name}…` });
      try {
        await applySnapshot(performAction(application.status === "paused" ? "resume" : "pause", application.id));
        toast.style = Toast.Style.Success;
        toast.title = application.status === "paused" ? `Resumed ${application.name}` : `Paused ${application.name}`;
      } catch (caught) {
        toast.style = Toast.Style.Failure;
        toast.title = `Could not ${verb.toLowerCase().replace("ing", "e")} ${application.name}`;
        toast.message = readableError(caught);
      }
    },
    [applySnapshot],
  );

  const quitApplication = useCallback(
    async (application: AppFreezerApplication) => {
      if (
        !(await confirmAlert({
          title: `Quit ${application.name}?`,
          message:
            application.status === "paused"
              ? "App Freezer will resume the application before asking it to quit."
              : "The application will receive a normal Quit request.",
          primaryAction: { title: "Quit", style: Alert.ActionStyle.Destructive },
        }))
      ) {
        return;
      }
      const toast = await showToast({ style: Toast.Style.Animated, title: `Quitting ${application.name}…` });
      try {
        await applySnapshot(performAction("quit", application.id));
        toast.style = Toast.Style.Success;
        toast.title = `Quit requested for ${application.name}`;
      } catch (caught) {
        toast.style = Toast.Style.Failure;
        toast.title = `Could not quit ${application.name}`;
        toast.message = readableError(caught);
      }
    },
    [applySnapshot],
  );

  const resumeAll = useCallback(async () => {
    await applySnapshot(performAction("resume-all"));
  }, [applySnapshot]);

  const sections = useMemo(() => {
    const applications = snapshot?.applications || [];
    return {
      paused: sortApplications(
        applications.filter((application) => application.status === "paused"),
        sortMode,
      ),
      running: sortApplications(
        applications.filter((application) => application.status === "running"),
        sortMode,
      ),
    };
  }, [snapshot, sortMode]);

  if (error) {
    const notInstalled = error instanceof AppFreezerNotInstalledError;
    return (
      <List isLoading={isLoading}>
        <List.EmptyView
          icon={notInstalled ? Icon.Download : Icon.Warning}
          title={notInstalled ? "App Freezer Is Not Installed" : "Could Not Load Applications"}
          description={readableError(error)}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={revalidate} />
              {!notInstalled && <Action title="Open App Freezer Settings" icon={Icon.Gear} onAction={openSettings} />}
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search applications…"
      searchBarAccessory={<ApplicationSortDropdown value={sortMode} onChange={setSortMode} />}
    >
      <List.Section title="Paused" subtitle={String(sections.paused.length)}>
        {sections.paused.map((application) => (
          <ApplicationItem
            key={application.id}
            application={application}
            runAction={runAction}
            quitApplication={quitApplication}
            refresh={revalidate}
            resumeAll={resumeAll}
          />
        ))}
      </List.Section>
      <List.Section title="Running Applications" subtitle={String(sections.running.length)}>
        {sections.running.map((application) => (
          <ApplicationItem
            key={application.id}
            application={application}
            runAction={runAction}
            quitApplication={quitApplication}
            refresh={revalidate}
            resumeAll={resumeAll}
          />
        ))}
      </List.Section>
      {!isLoading && sections.paused.length === 0 && sections.running.length === 0 ? (
        <List.EmptyView
          icon={Icon.AppWindow}
          title="No Applications"
          description="App Freezer did not report any controllable applications."
          actions={
            <ActionPanel>
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
              <Action title="Open App Freezer Settings" icon={Icon.Gear} onAction={openSettings} />
            </ActionPanel>
          }
        />
      ) : null}
    </List>
  );
}
