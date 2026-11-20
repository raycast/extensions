import {
  Action,
  ActionPanel,
  closeMainWindow,
  Form,
  getPreferenceValues,
  Icon,
  Keyboard,
  launchCommand,
  LaunchType,
  openExtensionPreferences,
  PopToRootType,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast, useForm, usePromise } from "@raycast/utils";
import { homedir } from "node:os";
import { useEffect, useMemo, useRef, useState } from "react";
import { shortenDirectory } from "./lib/directories";
import { KeroClient, KeroError } from "./lib/kero";
import type { Session } from "./lib/model";
import { NewSessionFormValues, SessionInputError, sessionInputFromForm } from "./lib/new-session";
import { SessionCreationRequest } from "./lib/session-creation";
import { InstallKeroAction } from "./components/install-kero-action";

export async function openSessionSearch() {
  try {
    await launchCommand({ name: "search-sessions", type: LaunchType.UserInitiated });
  } catch (error) {
    await showFailureToast(error, { title: "Could Not Open Search Kero Sessions" });
  }
}

export function NewSessionForm({ isNested = false }: { isNested?: boolean }) {
  const { keroPath } = getPreferenceValues<Preferences>();
  const client = useMemo(() => new KeroClient(keroPath), [keroPath]);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<Session>();
  const [uncertainMessage, setUncertainMessage] = useState<string>();
  const mounted = useRef(false);
  const submitting = useRef(false);
  const [request] = useState(() => new SessionCreationRequest());
  const { handleSubmit, itemProps, values, setValue, setValidationError } = useForm<NewSessionFormValues>({
    initialValues: { name: "", directory: [] },
    onSubmit: submit,
  });
  const projectsAbort = useRef<AbortController | null>(null);
  const {
    data: projects = [],
    isLoading: loadingProjects,
    error: projectError,
    revalidate: refreshProjects,
  } = usePromise((path?: string) => new KeroClient(path).projects(projectsAbort.current?.signal), [keroPath], {
    abortable: projectsAbort,
    onData: (result) => setValue("projectId", (current) => current ?? result[0]?.id),
    // The form renders this error with Refresh Projects / Download Kero actions.
    onError: () => undefined,
  });

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  async function submit(values: NewSessionFormValues = {}) {
    if (submitting.current || request.uncertain) return;
    if (!request.session && (loadingProjects || projectError)) return;
    submitting.current = true;
    setBusy(true);
    for (const field of ["projectId", "directory", "name"] as const) setValidationError(field, undefined);
    let opened = false;
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: request.session ? "Opening Kero Session…" : "Creating Kero Session…",
      });
      if (!request.session && !selectedProject)
        throw new SessionInputError("projectId", "Select an existing project first.");
      const result = await request.run(
        client,
        request.session
          ? {}
          : sessionInputFromForm({ ...values, projectId: selectedProjectId, directory: [directory] }),
        { isActive: () => mounted.current, onCreated: setCreated },
      );
      if (!result.opened) {
        await showToast({
          style: Toast.Style.Success,
          title: "Kero Session Created",
          message: "Open it with Search Kero Sessions.",
        });
        return;
      }
      opened = true;
      await showToast({ style: Toast.Style.Success, title: "Kero Session Opened" });
      if (mounted.current) await closeMainWindow({ popToRootType: PopToRootType.Immediate });
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : String(reason);
      if (reason instanceof SessionInputError && mounted.current) {
        setValidationError(reason.field, message);
      }
      if (reason instanceof KeroError && reason.kind === "creation-uncertain" && mounted.current) {
        setUncertainMessage(message);
      }
      await showFailureToast(reason, {
        title: opened
          ? "Session Opened, but Raycast Could Not Close"
          : request.session
            ? "Session Created, but Could Not Open"
            : request.uncertain
              ? "Session Creation Unconfirmed"
              : "Could Not Create Kero Session",
      });
    } finally {
      submitting.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  const selectedProjectId = values.projectId ?? projects[0]?.id ?? "";
  const selectedProject = projects.find((project) => project.id === selectedProjectId);
  const directory = values.directory?.[0] || selectedProject?.dir || homedir();
  return (
    <Form
      navigationTitle={isNested ? "New Kero Session" : undefined}
      isLoading={loadingProjects || busy}
      actions={
        <ActionPanel>
          {created ? (
            <>
              <Action title="Open Created Session" icon={Icon.Terminal} onAction={() => submit()} />
              <Action.CopyToClipboard title="Copy Session ID" content={created.id} />
              <Action.CopyToClipboard title="Copy Pane ID" content={created.panes[0].id} />
            </>
          ) : !uncertainMessage && !projectError && !loadingProjects && selectedProject ? (
            <Action.SubmitForm<NewSessionFormValues> title="Create and Open" icon={Icon.Plus} onSubmit={handleSubmit} />
          ) : null}
          <Action title="Search Kero Sessions" icon={Icon.MagnifyingGlass} onAction={openSessionSearch} />
          {!created && !uncertainMessage && (
            <Action
              title="Refresh Projects"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={() => void refreshProjects()}
            />
          )}
          <InstallKeroAction error={projectError} />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    >
      {created ? (
        <Form.Description
          title="Session Created"
          text={`Session ${created.id} already exists. Use Open Created Session to retry opening it; no additional session will be created.`}
        />
      ) : uncertainMessage ? (
        <Form.Description title="Check Before Retrying" text={uncertainMessage} />
      ) : (
        <>
          {projectError && (
            <Form.Description
              title="Could Not Load Projects"
              text={`${projectError.message} Use Refresh Projects to retry.`}
            />
          )}
          {!loadingProjects && !projectError && projects.length === 0 && (
            <Form.Description title="No Projects" text="Add a project in Kero, then use Refresh Projects." />
          )}
          <Form.Dropdown
            {...itemProps.projectId}
            title="Project"
            value={selectedProjectId}
            onChange={(value) => {
              if (!value || value === selectedProjectId) return;
              itemProps.projectId.onChange?.(value);
              setValue("directory", []);
              setValidationError("directory", undefined);
            }}
            info="Choose an existing project. Switching projects resets the working directory to that project's directory."
          >
            {selectedProjectId && !selectedProject && (
              <Form.Dropdown.Item value={selectedProjectId} title="Unavailable Project — Refresh and Choose Another" />
            )}
            {projects.map((project) => (
              <Form.Dropdown.Item key={project.id} value={project.id} title={project.name} />
            ))}
          </Form.Dropdown>
          <Form.FilePicker
            {...itemProps.directory}
            title="Working Directory"
            value={[directory]}
            canChooseDirectories
            canChooseFiles={false}
            allowMultipleSelection={false}
            info={`Current directory: ${shortenDirectory(directory)}. Click to choose another folder in the macOS picker. Switching projects restores the project's directory. Kero starts its configured shell.`}
          />
          <Form.TextField
            {...itemProps.name}
            title="Session Name"
            placeholder="Optional — use Kero's automatic title"
            info="Leave empty to retain Kero's automatic title."
          />
        </>
      )}
    </Form>
  );
}

export default function NewSession() {
  return <NewSessionForm />;
}
