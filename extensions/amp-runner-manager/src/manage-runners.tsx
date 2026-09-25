import {
  Action,
  ActionPanel,
  Alert,
  Form,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  getPreferenceValues,
  open,
  openExtensionPreferences,
  showToast,
  useNavigation,
} from "@raycast/api";
import { basename, dirname } from "node:path";
import { useCallback, useEffect, useState } from "react";
import {
  Runner,
  RunnerDirectory,
  addDirectory,
  displayPath,
  listRunners,
  removeDirectory,
} from "./amp";

type Preferences = { ampPath?: string };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected error";
}

async function openAmpRunnerSettings() {
  await open("/Applications/Amp.app");
  await showToast({
    style: Toast.Style.Success,
    title: "Amp opened",
    message: "Open Settings to manage this Mac's runner.",
  });
}

function AddFolderForm({
  runners,
  initialRunnerId,
  ampPath,
  onAdded,
}: {
  runners: Runner[];
  initialRunnerId: string;
  ampPath: string;
  onAdded: () => Promise<void>;
}) {
  const { pop } = useNavigation();
  const [submitting, setSubmitting] = useState(false);

  async function submit(values: { runnerId: string; folder: string[] }) {
    const folder = values.folder[0];
    if (!folder) {
      await showToast({ style: Toast.Style.Failure, title: "Choose a folder" });
      return;
    }

    setSubmitting(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Adding folder…",
    });
    try {
      await addDirectory(ampPath, values.runnerId, folder);
      await onAdded();
      toast.style = Toast.Style.Success;
      toast.title = "Folder added";
      toast.message = displayPath(folder);
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not add folder";
      toast.message = errorMessage(error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={submitting}
      navigationTitle="Add Served Folder"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Folder"
            icon={Icon.Plus}
            onSubmit={submit}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="runnerId"
        title="Runner"
        defaultValue={initialRunnerId}
      >
        {runners.map((runner) => (
          <Form.Dropdown.Item
            key={runner.runnerId}
            value={runner.runnerId}
            title={runner.runnerId}
          />
        ))}
      </Form.Dropdown>
      <Form.FilePicker
        id="folder"
        title="Folder"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
      />
      <Form.Description text="Amp will serve this folder immediately and remember it after the runner restarts." />
    </Form>
  );
}

function RunnerActions({
  runner,
  directory,
  runners,
  ampPath,
  refresh,
}: {
  runner: Runner;
  directory?: RunnerDirectory;
  runners: Runner[];
  ampPath: string;
  refresh: () => Promise<void>;
}) {
  async function remove() {
    if (!directory) return;
    const confirmed = await confirmAlert({
      title: "Stop serving this folder?",
      message: `${displayPath(directory.path)} will no longer be available for new threads on ${runner.runnerId}. Files on disk will not be changed.`,
      primaryAction: {
        title: "Remove Folder",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Removing folder…",
    });
    try {
      await removeDirectory(ampPath, runner.runnerId, directory.path);
      await refresh();
      toast.style = Toast.Style.Success;
      toast.title = "Folder removed";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not remove folder";
      toast.message = errorMessage(error);
    }
  }

  return (
    <ActionPanel>
      {directory ? (
        <ActionPanel.Section>
          <Action.Open
            title="Open Folder"
            target={directory.path}
            icon={Icon.Folder}
          />
          <Action.ShowInFinder path={directory.path} />
          <Action.CopyToClipboard
            title="Copy Folder Path"
            content={directory.path}
          />
        </ActionPanel.Section>
      ) : null}
      <ActionPanel.Section>
        <Action.Push
          title="Add Served Folder"
          icon={Icon.Plus}
          shortcut={Keyboard.Shortcut.Common.New}
          target={
            <AddFolderForm
              runners={runners}
              initialRunnerId={runner.runnerId}
              ampPath={ampPath}
              onAdded={refresh}
            />
          }
        />
        {directory ? (
          <Action
            title="Remove Served Folder"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={Keyboard.Shortcut.Common.Remove}
            onAction={remove}
          />
        ) : null}
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Open Amp Runner Settings"
          icon={Icon.Gear}
          onAction={openAmpRunnerSettings}
        />
        <Action
          title="Refresh Runners"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={refresh}
        />
        <Action
          title="Open Extension Preferences"
          icon={Icon.Gear}
          onAction={openExtensionPreferences}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

export default function Command() {
  const { ampPath = "~/.local/bin/amp" } = getPreferenceValues<Preferences>();
  const [runners, setRunners] = useState<Runner[]>([]);
  const [selectedRunnerId, setSelectedRunnerId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setRunners(await listRunners(ampPath));
      setError("");
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setLoading(false);
    }
  }, [ampPath]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (
      runners.length > 0 &&
      !runners.some((runner) => runner.runnerId === selectedRunnerId)
    ) {
      setSelectedRunnerId(runners[0].runnerId);
    }
  }, [runners, selectedRunnerId]);

  const selectedRunner =
    runners.find((runner) => runner.runnerId === selectedRunnerId) ??
    runners[0];

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="Search served folders…"
      searchBarAccessory={
        runners.length > 0 ? (
          <List.Dropdown
            tooltip="Select Runner"
            value={selectedRunner?.runnerId}
            onChange={setSelectedRunnerId}
          >
            {runners.map((runner) => (
              <List.Dropdown.Item
                key={runner.runnerId}
                title={runner.runnerId}
                value={runner.runnerId}
              />
            ))}
          </List.Dropdown>
        ) : undefined
      }
    >
      <List.EmptyView
        icon={{ source: "icon.png" }}
        title={error ? "Could not load Amp runners" : "No local Amp runners"}
        description={
          error || "Turn on “Use This Mac as a Runner” in Amp Settings."
        }
        actions={
          <ActionPanel>
            <Action
              title="Refresh Runners"
              icon={Icon.ArrowClockwise}
              onAction={refresh}
            />
            <Action
              title="Open Amp Runner Settings"
              icon={Icon.Gear}
              onAction={openAmpRunnerSettings}
            />
            <Action
              title="Open Extension Preferences"
              onAction={openExtensionPreferences}
            />
          </ActionPanel>
        }
      />
      {selectedRunner ? (
        <List.Section
          key={selectedRunner.runnerId}
          title={selectedRunner.runnerId}
          subtitle={`${selectedRunner.directories.length} ${selectedRunner.directories.length === 1 ? "folder" : "folders"}`}
        >
          {selectedRunner.directories.length === 0 ? (
            <List.Item
              title="No served folders"
              subtitle="Add a folder to make it available for new threads"
              icon={Icon.Folder}
              actions={
                <RunnerActions
                  runner={selectedRunner}
                  runners={runners}
                  ampPath={ampPath}
                  refresh={refresh}
                />
              }
            />
          ) : (
            selectedRunner.directories.map((directory) => (
              <List.Item
                key={directory.path}
                title={basename(directory.path) || directory.path}
                subtitle={displayPath(dirname(directory.path))}
                keywords={[
                  directory.path,
                  selectedRunner.runnerId,
                  directory.repositoryURL || "",
                ]}
                icon={directory.repositoryURL ? Icon.Code : Icon.Folder}
                accessories={[
                  directory.canCreateWorktree
                    ? { tag: "Worktrees" }
                    : { text: "Folder" },
                ]}
                actions={
                  <RunnerActions
                    runner={selectedRunner}
                    directory={directory}
                    runners={runners}
                    ampPath={ampPath}
                    refresh={refresh}
                  />
                }
              />
            ))
          )}
        </List.Section>
      ) : null}
    </List>
  );
}
