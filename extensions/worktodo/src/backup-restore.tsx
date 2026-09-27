import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Detail,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { launchMyTasks, requestMenuBarRefresh } from "./raycast-commands";
import { openProductionWorktodo, type WorktodoSession } from "./shared/application/worktodo";
import type { PortabilityService, PreparedImport } from "./shared/portability/portability-service";
import { PortabilityError } from "./shared/portability/backup-contract";
import {
  exportSuccessMarkdown,
  failurePresentation,
  importPreviewMarkdown,
  importSuccessMarkdown,
} from "./shared/presentation/backup-restore";

type PickerValues = {
  selection: string[];
};

function selectedPath(values: PickerValues, kind: "folder" | "file"): string | null {
  if (values.selection.length !== 1) {
    void showToast(Toast.Style.Failure, `Choose one ${kind}`);
    return null;
  }
  return values.selection[0];
}

function ExportResult({ path }: { path: string }) {
  return (
    <Detail
      markdown={exportSuccessMarkdown(path)}
      actions={
        <ActionPanel>
          <Action.ShowInFinder path={path} title="Show Backup in Finder" />
        </ActionPanel>
      }
    />
  );
}

function ExportForm({ portability }: { portability: PortabilityService }) {
  const { push } = useNavigation();

  async function submit(values: PickerValues) {
    const directory = selectedPath(values, "folder");
    if (!directory) {
      return;
    }
    try {
      const result = portability.exportTo(directory);
      await showToast(Toast.Style.Success, "Backup exported", result.path);
      push(<ExportResult path={result.path} />);
    } catch (error) {
      const failure = failurePresentation(error, "export");
      await showToast(Toast.Style.Failure, failure.title, failure.message);
    }
  }

  return (
    <Form
      navigationTitle="Export backup"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Export Backup" icon={Icon.Download} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="selection"
        title="Destination"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
      />
      <Form.Description text="Worktodo generates a timestamped JSON backup and never replaces an existing file." />
    </Form>
  );
}

function ImportResult({ recoveryPath }: { recoveryPath: string }) {
  return (
    <Detail
      markdown={importSuccessMarkdown(recoveryPath)}
      actions={
        <ActionPanel>
          <Action title="Open All Tasks" icon={Icon.CheckCircle} onAction={() => launchMyTasks({ view: "all" })} />
          <Action.ShowInFinder path={recoveryPath} title="Show Recovery Backup in Finder" />
        </ActionPanel>
      }
    />
  );
}

function ImportFailure({ message, recoveryPath }: { message: string; recoveryPath: string }) {
  return (
    <Detail
      markdown={`# Backup restore failed\n\n${message}\n\nA recovery backup is available at:\n\n${recoveryPath}`}
      actions={
        <ActionPanel>
          <Action.ShowInFinder path={recoveryPath} title="Show Recovery Backup in Finder" />
        </ActionPanel>
      }
    />
  );
}

function ImportPreviewView({ portability, prepared }: { portability: PortabilityService; prepared: PreparedImport }) {
  const { pop, push } = useNavigation();

  async function replace() {
    const confirmed = await confirmAlert({
      title: prepared.preview.confirmationTitle,
      message: prepared.preview.warning,
      primaryAction: { title: "Replace Worktodo Data", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) {
      return;
    }
    try {
      const result = portability.replace(prepared);
      requestMenuBarRefresh();
      await showToast(Toast.Style.Success, "Backup restored", result.recoveryPath);
      push(<ImportResult recoveryPath={result.recoveryPath} />);
    } catch (error) {
      const failure = failurePresentation(error, "import");
      await showToast(Toast.Style.Failure, failure.title, failure.message);
      if (error instanceof PortabilityError && error.code === "STALE_PREVIEW") {
        pop();
        return;
      }
      if (failure.recoveryPath) {
        push(<ImportFailure message={failure.message} recoveryPath={failure.recoveryPath} />);
      }
    }
  }

  return (
    <Detail
      markdown={importPreviewMarkdown(prepared.preview)}
      actions={
        <ActionPanel>
          <Action
            title="Replace Worktodo Data"
            icon={Icon.HardDrive}
            style={Action.Style.Destructive}
            onAction={replace}
          />
        </ActionPanel>
      }
    />
  );
}

function ImportForm({ portability }: { portability: PortabilityService }) {
  const { push } = useNavigation();

  async function submit(values: PickerValues) {
    const path = selectedPath(values, "file");
    if (!path) {
      return;
    }
    try {
      const prepared = portability.prepare(path);
      push(<ImportPreviewView portability={portability} prepared={prepared} />);
    } catch (error) {
      const failure = failurePresentation(error, "import");
      await showToast(Toast.Style.Failure, failure.title, failure.message);
    }
  }

  return (
    <Form
      navigationTitle="Restore backup"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Preview Backup" icon={Icon.Upload} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker id="selection" title="Backup file" allowMultipleSelection={false} />
      <Form.Description text="Worktodo validates the entire backup before showing what will be replaced." />
    </Form>
  );
}

export default function Command() {
  const [session, setSession] = useState<WorktodoSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let opened: WorktodoSession | null = null;
    try {
      opened = openProductionWorktodo();
      setSession(opened);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "An unexpected error occurred");
    }
    return () => opened?.close();
  }, []);

  return (
    <List isLoading={!session && !error} searchBarPlaceholder="Export or restore Worktodo data">
      {error ? (
        <List.EmptyView icon={Icon.Warning} title="Unable to open Worktodo" description={error} />
      ) : session ? (
        <>
          <List.Item
            title="Export backup"
            subtitle="Create a complete JSON backup"
            icon={Icon.Download}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Export Backup"
                  icon={Icon.Download}
                  target={<ExportForm portability={session.portability} />}
                />
              </ActionPanel>
            }
          />
          <List.Item
            title="Restore backup"
            subtitle="Preview a backup, then replace current data"
            icon={Icon.Upload}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Restore Backup"
                  icon={Icon.Upload}
                  target={<ImportForm portability={session.portability} />}
                />
              </ActionPanel>
            }
          />
        </>
      ) : null}
    </List>
  );
}
