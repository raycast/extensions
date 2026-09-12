import {
  Action,
  ActionPanel,
  Form,
  getSelectedFinderItems,
  Icon,
  LaunchProps,
  List,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { ConnectionEmptyView } from "./components/connection-state";
import { useConnectedBoox } from "./hooks/use-connected-boox";
import { useQuery } from "./hooks/use-query";
import { describeBooxError } from "./lib/errors";
import { getBooxPreferences } from "./lib/preferences";
import { displayRemotePath } from "./lib/paths";
import { describeTransferSuccess } from "./lib/transfer-feedback";
import { ConflictPolicy, TransferMode } from "./models/boox";
import { getRecentDestinations, rememberDestination } from "./operations/recent-destinations";
import { transferFiles } from "./operations/transfer";

interface SendLaunchContext {
  paths?: string[];
  mode?: TransferMode;
  destination?: string;
  libraryParentId?: string;
  libraryParentTitle?: string;
}

interface FormValues {
  files: string[];
  conflictPolicy: ConflictPolicy;
}

export default function SendToBoox(props: LaunchProps<{ launchContext?: SendLaunchContext }>) {
  const connection = useConnectedBoox();
  const initialMode = props.launchContext?.mode ?? "storage";
  const preferences = getBooxPreferences();
  const initialDestination = props.launchContext?.destination || preferences.quickSendDirectory || "/Download";
  const [mode, setMode] = useState<TransferMode>(initialMode);
  const [files, setFiles] = useState<string[]>(props.launchContext?.paths ?? []);
  const [destination, setDestination] = useState(displayRemotePath(initialDestination));
  const [recentSelection, setRecentSelection] = useState("");
  const [libraryParentId, setLibraryParentId] = useState(props.launchContext?.libraryParentId || "");
  const [isSubmitting, setSubmitting] = useState(false);
  const filesEditedRef = useRef(false);
  const client = connection.data?.client;
  const device = connection.data?.device;
  const library = useQuery(
    `send-library-shelves:${client?.host ?? "none"}`,
    () => client!.getLibrary(),
    Boolean(client)
  );
  const recent = useQuery(
    `send-recent-destinations:${device?.id ?? "none"}`,
    () => getRecentDestinations(device!.id),
    Boolean(device)
  );

  useEffect(() => {
    if (props.launchContext?.paths?.length) return;
    let active = true;
    getSelectedFinderItems()
      .then((items) => {
        if (!active || filesEditedRef.current) return;
        setFiles((current) => (current.length ? current : items.map((item) => item.path)));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [props.launchContext?.paths]);

  if (!connection.data) {
    return (
      <List isLoading={connection.isLoading}>
        <ConnectionEmptyView
          error={connection.error}
          isLoading={connection.isLoading}
          onRetry={connection.revalidate}
        />
      </List>
    );
  }

  const connected = connection.data;

  return (
    <Form
      isLoading={(mode === "library" && library.isLoading) || isSubmitting}
      navigationTitle={`Send to ${connected.device.model}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={mode === "library" ? "Add to Library" : "Send Files"}
            icon={Icon.Upload}
            onSubmit={async (values: FormValues) => {
              if (isSubmitting) return;
              setSubmitting(true);
              const toast = await showToast({
                style: Toast.Style.Animated,
                title: mode === "library" ? "Adding to BOOX Library" : "Sending to BOOX",
                message: `0 / ${values.files.length}`,
              });
              try {
                if (mode === "library" && libraryParentId) {
                  if (library.isLoading) throw new Error("Wait for the BOOX shelves to finish loading");
                  const launchedFromShelf = props.launchContext?.libraryParentId === libraryParentId;
                  if (!launchedFromShelf && !library.data?.shelves.some((shelf) => shelf.id === libraryParentId)) {
                    throw new Error("The selected BOOX shelf is unavailable");
                  }
                }
                const result = await transferFiles({
                  client: connected.client,
                  paths: values.files,
                  mode,
                  destination,
                  libraryParentId: libraryParentId || undefined,
                  conflictPolicy: mode === "library" ? "skip" : values.conflictPolicy,
                  onProgress: (completed, total, fileName) => {
                    toast.message = `${completed} / ${total} · ${fileName}`;
                  },
                });
                if (mode === "storage" && result.uploaded > 0) {
                  await rememberDestination(connected.device.id, destination);
                }
                if (result.failed) {
                  toast.style = Toast.Style.Failure;
                  toast.title = `${result.failed} File${result.failed === 1 ? "" : "s"} Failed`;
                  toast.message = result.items.find((item) => item.error)?.error;
                  return;
                }
                await toast.hide();
                await showHUD(describeTransferSuccess(result, connected.device.model, mode), {
                  clearRootSearch: true,
                });
              } catch (error) {
                toast.style = Toast.Style.Failure;
                toast.title = "Transfer Failed";
                toast.message = describeBooxError(error);
              } finally {
                setSubmitting(false);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Device" text={`${connected.device.model} · ${connected.device.host}`} />
      <Form.FilePicker
        id="files"
        title="Files"
        value={files}
        onChange={(value) => {
          filesEditedRef.current = true;
          setFiles(value);
        }}
        allowMultipleSelection
        canChooseDirectories={false}
      />
      <Form.Dropdown id="mode" title="Operation" value={mode} onChange={(value) => setMode(value as TransferMode)}>
        <Form.Dropdown.Item value="storage" title="Send to Storage" icon={Icon.HardDrive} />
        <Form.Dropdown.Item value="library" title="Add to Library" icon={Icon.Book} />
      </Form.Dropdown>
      {mode === "storage" ? (
        <>
          <Form.TextField
            id="destination"
            title="Destination"
            value={destination}
            onChange={setDestination}
            placeholder="/Download"
          />
          {recent.data?.length ? (
            <Form.Dropdown
              id="recentDestination"
              title="Recent Destinations"
              value={recentSelection}
              onChange={(value) => {
                setRecentSelection(value);
                if (value) setDestination(value);
              }}
            >
              <Form.Dropdown.Item value="" title="Choose a Recent Folder" icon={Icon.Clock} />
              {recent.data.map((item) => (
                <Form.Dropdown.Item key={item.path} value={item.path} title={item.path} icon={Icon.Folder} />
              ))}
            </Form.Dropdown>
          ) : (
            <Form.Description title="Recent Destinations" text="No recent folders yet" />
          )}
        </>
      ) : (
        <>
          <Form.Dropdown id="libraryParentId" title="Shelf" value={libraryParentId} onChange={setLibraryParentId}>
            <Form.Dropdown.Item value="" title="Library Root" icon={Icon.Book} />
            {libraryParentId && !library.data?.shelves.some((shelf) => shelf.id === libraryParentId) ? (
              <Form.Dropdown.Item
                value={libraryParentId}
                title={
                  props.launchContext?.libraryParentTitle ||
                  (library.isLoading ? "Loading Selected Shelf…" : "Selected Shelf Unavailable")
                }
                icon={
                  props.launchContext?.libraryParentId === libraryParentId
                    ? Icon.Folder
                    : library.isLoading
                      ? Icon.Clock
                      : Icon.Warning
                }
              />
            ) : null}
            {library.data?.shelves.map((shelf) => (
              <Form.Dropdown.Item key={shelf.id} value={shelf.id} title={shelf.title} icon={Icon.Folder} />
            ))}
          </Form.Dropdown>
          <Form.Description
            title="Library Import"
            text="Uses the BOOX Library uploader, then verifies that each document appears in the Library index."
          />
        </>
      )}
      {mode === "storage" ? (
        <Form.Dropdown id="conflictPolicy" title="Existing Files" defaultValue="skip">
          <Form.Dropdown.Item value="skip" title="Skip Existing Files" icon={Icon.Forward} />
          <Form.Dropdown.Item value="replace" title="Replace Existing Files" icon={Icon.ArrowClockwise} />
        </Form.Dropdown>
      ) : (
        <Form.Description title="Existing Documents" text="Documents already in the Library are skipped." />
      )}
    </Form>
  );
}
