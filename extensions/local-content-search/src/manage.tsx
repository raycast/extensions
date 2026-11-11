import {
  Action,
  ActionPanel,
  Form,
  Icon,
  List,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { LocalClient } from "../service/client";
import { Config, Status, validateConfig } from "../service/protocol";
import { retainStatus } from "./state";
import { InstallationGate } from "./installation";
import { showFailureToast } from "@raycast/utils";

// All indexing controls go through the service; the UI never touches SQL or model state.
const client = new LocalClient();
const STATUS_POLL_MS = 2000;

function Settings({ status, saved }: { status: Status; saved: () => void }) {
  const { pop } = useNavigation();
  async function submit(values: {
    roots: string[];
    excludedFolders: string[];
    extensions: string;
    powerMode: string;
    memory: string;
  }) {
    try {
      const config = validateConfig({
        ...status.config,
        roots: values.roots,
        excludedFolders: values.excludedFolders,
        excludedExtensions: values.extensions
          .split(",")
          .map((value) => value.trim().replace(/^\./, "").toLowerCase())
          .filter(Boolean),
        powerMode: values.powerMode,
        memoryLimitMb: Number(values.memory),
      });
      await client.configure(config, status.config);
      saved();
      pop();
      await showToast({
        style: Toast.Style.Success,
        title: "Folder settings saved",
      });
    } catch (error) {
      await showFailureToast(error, { title: "Settings not saved" });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Index Settings" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Privacy"
        text="Selected content is read locally and stored in a private index. Exclusions cannot detect every secret. No cloud model is used."
      />
      <Form.FilePicker
        id="roots"
        title="Folders to Index"
        defaultValue={status.config.roots}
        canChooseDirectories
        canChooseFiles={false}
        allowMultipleSelection
      />
      <Form.FilePicker
        id="excludedFolders"
        title="Excluded Folders"
        defaultValue={status.config.excludedFolders}
        canChooseDirectories
        canChooseFiles={false}
        allowMultipleSelection
      />
      <Form.TextField
        id="extensions"
        title="Excluded File Types"
        defaultValue={status.config.excludedExtensions.join(", ")}
        placeholder="pdf, mp4, wav"
      />
      <Form.Dropdown
        id="powerMode"
        title="Indexing Power Policy"
        defaultValue={status.config.powerMode}
      >
        <Form.Dropdown.Item
          value="balanced"
          title="Battery or charger; pause in Low Power Mode"
        />
        <Form.Dropdown.Item
          value="ac-only"
          title="Only while connected to a charger"
        />
      </Form.Dropdown>
      <Form.Dropdown
        id="memory"
        title="Worker Memory Budget"
        defaultValue={String(status.config.memoryLimitMb)}
      >
        <Form.Dropdown.Item
          value="1024"
          title="1 GB — may stop media indexing"
        />
        <Form.Dropdown.Item value="2048" title="2 GB — recommended" />
        <Form.Dropdown.Item value="4096" title="4 GB — larger media" />
      </Form.Dropdown>
      <Form.Description
        title="Limits"
        text="One native worker, up to four CPU threads. macOS receives the selected memory budget; monitoring also stops workers above it. These controls cannot guarantee against system or driver crashes."
      />
    </Form>
  );
}

// The setup gate prevents the first status poll from showing a missing-service error.
export default function Manage() {
  return (
    <InstallationGate>
      <ManageView />
    </InstallationGate>
  );
}

function ManageView() {
  const [status, setStatus] = useState<Status>();
  const [error, setError] = useState<string>();
  const { push } = useNavigation();
  const refresh = () => {
    void client
      .status()
      .then((value) => {
        setStatus((previous) => retainStatus(previous, value));
        setError(undefined);
      })
      .catch((failure) => {
        setError(failure.message);
      });
  };
  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, STATUS_POLL_MS);
    return () => {
      clearInterval(timer);
    };
  }, []);
  async function update(config: Config, expected: Config) {
    try {
      setStatus(await client.configure(config, expected));
    } catch (failure) {
      refresh();
      await showFailureToast(failure, { title: "Control failed" });
    }
  }
  const controls = (
    <ActionPanel>
      {status && (
        <>
          <Action
            title="Choose Folders and Limits"
            icon={Icon.Folder}
            onAction={() => push(<Settings status={status} saved={refresh} />)}
          />
          <Action
            title={status.config.paused ? "Resume Indexing" : "Pause Indexing"}
            icon={status.config.paused ? Icon.Play : Icon.Pause}
            onAction={() =>
              update(
                { ...status.config, paused: !status.config.paused },
                status.config,
              )
            }
          />
          <Action
            title="Rescan Selected Folders"
            icon={Icon.ArrowClockwise}
            onAction={async () => {
              try {
                setStatus(await client.rescan());
              } catch (failure) {
                await showFailureToast(failure, { title: "Rescan failed" });
              }
            }}
          />
        </>
      )}
      <Action.Push
        title="Set Up Local Search"
        icon={Icon.Download}
        target={<Setup />}
      />
    </ActionPanel>
  );

  return (
    <List
      isLoading={!status && !error}
      searchBarPlaceholder="Index status and selected folders"
    >
      {error && (
        <List.Item
          title="Background service unavailable"
          subtitle={error}
          icon={Icon.ExclamationMark}
          actions={controls}
        />
      )}
      {status && (
        <>
          <List.Section title="Background Index">
            <List.Item
              title={status.activity}
              subtitle={
                status.error ??
                (status.modelReady
                  ? "EmbeddingGemma 2 installed locally"
                  : "Model download required")
              }
              icon={status.error ? Icon.ExclamationMark : Icon.HardDrive}
              actions={controls}
            />
            <List.Item
              title={`${status.counts?.searchable ?? 0} searchable files`}
              subtitle={`${status.counts?.pending ?? 0} pending · ${status.counts?.vectors ?? 0} vectors`}
              icon={Icon.Document}
              actions={controls}
            />
            {status.progress && (
              <List.Item
                title={`Processed ${status.progress.done} of ${status.progress.total}`}
                subtitle={status.progress.path}
                icon={Icon.Clock}
                actions={controls}
              />
            )}
          </List.Section>
          <List.Section title="Selected Folders">
            {status.config.roots.length === 0 && (
              <List.Item
                title="Choose your first folder"
                subtitle="No personal folders are indexed automatically"
                icon={Icon.Folder}
                actions={controls}
              />
            )}
            {status.config.roots.map((root) => (
              <List.Item
                key={root}
                title={root}
                subtitle={
                  status.missingRoots.includes(root)
                    ? "Unavailable — existing index retained"
                    : "Watched for changes"
                }
                icon={Icon.Folder}
                actions={controls}
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}

// Import the setup view without launching a separate Raycast command, preserving navigation.
import Setup from "./setup";
