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
import { homedir } from "node:os";
import { useEffect, useMemo, useRef, useState } from "react";
import { shortenDirectory } from "./lib/directories";
import { KeroClient, KeroError } from "./lib/kero";
import type { Project, Session } from "./lib/model";
import { NewSessionFormValues, NewSessionInput, SessionInputError, sessionInputFromForm } from "./lib/new-session";
import { SessionCreationRequest } from "./lib/session-creation";
import { InstallKeroAction } from "./components/install-kero-action";

export function NewSessionForm({ isNested = false }: { isNested?: boolean }) {
  const { keroPath } = getPreferenceValues<{ keroPath?: string }>();
  const client = useMemo(() => new KeroClient(keroPath), [keroPath]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string>();
  const [directoryOverride, setDirectoryOverride] = useState<string>();
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [projectError, setProjectError] = useState<Error>();
  const [revision, setRevision] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof NewSessionInput, string>>>({});
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<Session>();
  const [uncertainMessage, setUncertainMessage] = useState<string>();
  const mounted = useRef(false);
  const submitting = useRef(false);
  const [request] = useState(() => new SessionCreationRequest());

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoadingProjects(true);
    setProjectError(undefined);
    void client
      .projects(controller.signal)
      .then(
        (result) => {
          if (!controller.signal.aborted) {
            setProjects(result);
            setProjectId((current) => current ?? result[0]?.id);
          }
        },
        (reason: unknown) => {
          if (!controller.signal.aborted) setProjectError(reason instanceof Error ? reason : new Error(String(reason)));
        },
      )
      .finally(() => {
        if (!controller.signal.aborted) setLoadingProjects(false);
      });
    return () => controller.abort();
  }, [client, revision]);

  function clearError(field: keyof NewSessionInput) {
    setFieldErrors((errors) => ({ ...errors, [field]: undefined }));
  }

  async function submit(values: NewSessionFormValues = {}) {
    if (submitting.current || request.uncertain) return;
    if (!request.session && (loadingProjects || projectError)) return;
    submitting.current = true;
    setBusy(true);
    setFieldErrors({});
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
        setFieldErrors({ [reason.field]: message });
      }
      if (reason instanceof KeroError && reason.kind === "creation-uncertain" && mounted.current) {
        setUncertainMessage(message);
      }
      await showToast({
        style: Toast.Style.Failure,
        title: opened
          ? "Session Opened, but Raycast Could Not Close"
          : request.session
            ? "Session Created, but Could Not Open"
            : request.uncertain
              ? "Session Creation Unconfirmed"
              : "Could Not Create Kero Session",
        message,
      });
    } finally {
      submitting.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  const selectedProjectId = projectId ?? projects[0]?.id ?? "";
  const selectedProject = projects.find((project) => project.id === selectedProjectId);
  const directory = directoryOverride || selectedProject?.dir || homedir();
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
            <Action.SubmitForm<NewSessionFormValues> title="Create and Open" icon={Icon.Plus} onSubmit={submit} />
          ) : null}
          <Action
            title="Search Kero Sessions"
            icon={Icon.MagnifyingGlass}
            onAction={() => launchCommand({ name: "search-sessions", type: LaunchType.UserInitiated })}
          />
          {!created && !uncertainMessage && (
            <Action
              title="Refresh Projects"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={() => setRevision((value) => value + 1)}
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
            id="projectId"
            title="Project"
            value={selectedProjectId}
            error={fieldErrors.projectId}
            onChange={(value) => {
              if (!value || value === selectedProjectId) return;
              setProjectId(value);
              setDirectoryOverride(undefined);
              clearError("projectId");
              clearError("directory");
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
            id="directory"
            title="Working Directory"
            value={[directory]}
            canChooseDirectories
            canChooseFiles={false}
            allowMultipleSelection={false}
            info={`Current directory: ${shortenDirectory(directory)}. Click to choose another folder in the macOS picker. Switching projects restores the project's directory. Kero starts its configured shell.`}
            error={fieldErrors.directory}
            onChange={(paths) => {
              setDirectoryOverride(paths[0]);
              clearError("directory");
            }}
          />
          <Form.TextField
            id="name"
            title="Session Name"
            placeholder="Optional — use Kero's automatic title"
            info="Leave empty to retain Kero's automatic title."
            error={fieldErrors.name}
            onChange={() => clearError("name")}
          />
        </>
      )}
    </Form>
  );
}

export default function NewSession() {
  return <NewSessionForm />;
}
