import {
  Action,
  ActionPanel,
  closeMainWindow,
  Form,
  Icon,
  openExtensionPreferences,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import type { Client, Project } from "./api";
import { displayColor } from "./model";
import { session } from "./session";

export default function TimerForm({ onStarted }: { onStarted?: () => Promise<void> }) {
  const [connection] = useState(session);
  const { pop } = useNavigation();
  const [clients, setClients] = useState<Client[]>(() => connection.cached.clients() ?? []);
  const [projectSearch, setProjectSearch] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [projects, setProjects] = useState<Project[]>(
    () => connection.cached.projects(connection.cached.clients()?.[0]?.id ?? "") ?? [],
  );
  const [clientId, setClientId] = useState(() => connection.cached.clients()?.[0]?.id ?? "");
  const [projectId, setProjectId] = useState(() => projects[0]?.id ?? "");
  const [note, setNote] = useState("");
  const [billable, setBillable] = useState(true);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [startingAt, setStartingAt] = useState<number>();
  const [startingSeconds, setStartingSeconds] = useState(0);
  const [startingLabel, setStartingLabel] = useState("");
  useEffect(() => {
    if (startingAt === undefined) return;
    const tick = () => setStartingSeconds(Math.floor((Date.now() - startingAt) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startingAt]);
  const busy = useRef(false);
  const [reload, setReload] = useState(0);
  const loading = clientsLoading || projectsLoading || submitting;
  useEffect(() => {
    let current = true;
    setClientsLoading(true);
    // Render cached options immediately, then revalidate every time this form opens.
    Promise.all([connection.api.getClients(true), connection.pending()])
      .then(([items, operation]) => {
        if (!current) return;
        setClients(items);
        setPending(Boolean(operation));
        setClientId((value) =>
          items.some((item) => item.id === value) ? value : items[0]?.id || "",
        );
        setError(undefined);
      })
      .catch((e) => {
        if (current) setError(e instanceof Error ? e.message : "Could not load clients.");
      })
      .finally(() => {
        if (current) setClientsLoading(false);
      });
    return () => {
      current = false;
    };
  }, [connection, reload]);
  useEffect(() => {
    let current = true;
    setProjectsLoading(true);
    const cached = connection.cached.projects(clientId);
    setProjects(cached ?? []);
    setProjectId(cached?.[0]?.id ?? "");
    if (!clientId) {
      setProjectsLoading(false);
      return;
    }
    connection.api
      .getProjects(clientId, true)
      .then((items) => {
        if (current) {
          setProjects(items);
          setProjectId((value) =>
            items.some((item) => item.id === value) ? value : items[0]?.id || "",
          );
          setError(undefined);
        }
      })
      .catch((e) => {
        if (current) setError(e instanceof Error ? e.message : "Could not load projects.");
      })
      .finally(() => {
        if (current) setProjectsLoading(false);
      });
    return () => {
      current = false;
    };
  }, [clientId, connection, reload]);
  async function submit() {
    if (busy.current || loading) return;
    if (!projectId || note.length > 500) {
      setError("Choose a project and keep the note within 500 characters.");
      return;
    }
    busy.current = true;
    setSubmitting(true);
    setError(undefined);
    setStartingLabel(
      note.trim() || projects.find((project) => project.id === projectId)?.name || "Timer",
    );
    setStartingSeconds(0);
    setStartingAt(Date.now());
    try {
      await connection.execute("/timers/start", {
        projectId,
        billable,
        ...(note ? { note } : {}),
      });
      await showToast({ style: Toast.Style.Success, title: "Timer updated" });
      if (onStarted) {
        // The mutation is confirmed. Return immediately; list revalidation must
        // not delay navigation or turn an accepted timer into a failed action.
        const refresh = onStarted();
        pop();
        void refresh.catch(() =>
          showToast({
            style: Toast.Style.Failure,
            title: "Timer updated; could not refresh the list",
            message: "Refresh the timer list to load the latest state.",
          }),
        );
      } else await closeMainWindow();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start timer.");
      setPending(Boolean(await connection.pending()));
    } finally {
      setStartingAt(undefined);
      busy.current = false;
      setSubmitting(false);
    }
  }
  return (
    <Form
      isLoading={loading}
      navigationTitle={startingAt !== undefined ? "Starting Timer…" : "Start Timer"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={busy.current ? "Saving Timer…" : "Start Timer"}
            onSubmit={submit}
          />
          <Action
            title="Reload Clients and Projects"
            onAction={() => setReload((value) => value + 1)}
          />
          <Action.OpenInBrowser
            title="Manage Projects in TrackTimer"
            url={`${connection.baseUrl}/app/admin/projects`}
          />
          <Action title="Extension Settings" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    >
      {startingAt !== undefined && (
        <Form.Description
          title={`Starting · ${startingSeconds}s`}
          text={`${startingLabel} · Confirming with TrackTimer…`}
        />
      )}
      {pending && (
        <Form.Description
          title="Pending action"
          text="Starting this timer replaces the previous pending action with your current project and description."
        />
      )}
      {error && <Form.Description title="Unable to continue" text={error} />}
      <Form.Dropdown
        id="client"
        title="Client"
        placeholder="Select a client"
        value={clientId}
        filtering={false}
        onSearchTextChange={setClientSearch}
        onChange={(value) => {
          setProjects([]);
          setProjectId("");
          setProjectSearch("");
          setClientId(value);
        }}
      >
        {clients
          .filter((client) => client.name.toLowerCase().includes(clientSearch.trim().toLowerCase()))
          .map((client) => (
            <Form.Dropdown.Item
              key={client.id}
              value={client.id}
              title={client.name}
              icon={{ source: Icon.CircleFilled, tintColor: displayColor(client.color) }}
            />
          ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="project"
        title="Project"
        placeholder="Select a project"
        value={projectId}
        filtering={false}
        onSearchTextChange={setProjectSearch}
        onChange={setProjectId}
      >
        {projects
          .filter((project) =>
            project.name.toLowerCase().includes(projectSearch.trim().toLowerCase()),
          )
          .map((project) => (
            <Form.Dropdown.Item
              key={project.id}
              value={project.id}
              title={project.name}
              icon={{ source: Icon.CircleFilled, tintColor: displayColor(project.color) }}
            />
          ))}
      </Form.Dropdown>
      {!loading && !projects.length && (
        <Form.Description text="No assigned projects available for this client. Manage projects and assignments in TrackTimer, then reload." />
      )}
      <Form.TextArea
        id="note"
        title="Description"
        placeholder="What are you working on?"
        value={note}
        onChange={setNote}
        error={note.length > 500 ? "Use at most 500 characters." : undefined}
      />
      <Form.Checkbox id="billable" label="Billable" value={billable} onChange={setBillable} />
      <Form.Description text="Starting a timer completes any timer already running for you, including in another workspace." />
    </Form>
  );
}
