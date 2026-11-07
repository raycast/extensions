import {
  Action,
  ActionPanel,
  Form,
  Icon,
  List,
  Toast,
  closeMainWindow,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { ConnectionView } from "./components/connection-view";
import { DOWNLOAD_URL, findEdits, openEdits } from "./lib/application";
import { ConnectionError, parseConnectionConfig, safeConnectionError } from "./lib/config";
import { loadProjects, runProjectAction, type Project, type ProjectAction } from "./lib/projects";

function RenameProject({ project, onRename }: { project: Project; onRename: (name: string) => Promise<boolean> }) {
  const [name, setName] = useState(project.name);
  const [busy, setBusy] = useState(false);
  const { pop } = useNavigation();
  return (
    <Form
      isLoading={busy}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Rename Project"
            onSubmit={async () => {
              if (busy || !name.trim()) return;
              setBusy(true);
              try {
                if (await onRename(name)) pop();
              } finally {
                setBusy(false);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text={`Rename “${project.name}”.`} />
      <Form.TextField
        id="name"
        title="Project Name"
        value={name}
        onChange={setName}
        error={!name.trim() ? "Enter a name" : undefined}
      />
    </Form>
  );
}

export default function Command() {
  const [data, setData] = useState<Awaited<ReturnType<typeof loadProjects>>>();
  const [error, setError] = useState<ConnectionError>();
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const controller = useRef<AbortController | null>(null);

  async function refresh() {
    if (inFlight.current) return;
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setLoading(true);
    setError(undefined);
    setData(undefined);
    try {
      if (!(await findEdits()))
        throw new ConnectionError("Edits is not installed", "Install Edits for Mac before browsing projects.");
      const result = await loadProjects(parseConnectionConfig(getPreferenceValues()), current.signal);
      if (!current.signal.aborted) setData(result);
    } catch (failure) {
      if (!current.signal.aborted) setError(safeConnectionError(failure));
    } finally {
      if (!current.signal.aborted) setLoading(false);
    }
  }
  useEffect(() => {
    void refresh();
    return () => controller.current?.abort();
  }, []);

  async function execute(action: ProjectAction, project: Project, name?: string): Promise<boolean> {
    if (inFlight.current) return false;
    controller.current?.abort();
    inFlight.current = true;
    setBusy(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Updating Edits…" });
    let succeeded = false;
    try {
      await runProjectAction(parseConnectionConfig(getPreferenceValues()), action, project, name);
      succeeded = true;
      toast.style = Toast.Style.Success;
      toast.title =
        action === "openProject"
          ? "Project opened"
          : action === "duplicateProject"
            ? "Project duplicated"
            : "Project updated";
      if (action === "openProject") {
        const app = await findEdits();
        if (app) {
          await openEdits(app);
          await closeMainWindow();
        }
      }
    } catch (failure) {
      const issue = safeConnectionError(failure);
      toast.style = Toast.Style.Failure;
      toast.title = issue.title;
      toast.message = issue.message;
      // Require a fresh listing before another action after an uncertain result.
      setError(issue);
      setData(undefined);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
    if (succeeded) await refresh();
    return succeeded;
  }

  const commonActions = (
    <>
      <Action
        title="Refresh Projects"
        icon={Icon.ArrowClockwise}
        onAction={refresh}
        shortcut={Keyboard.Shortcut.Common.Refresh}
      />
      <Action.Push title="Connection Status and Setup" icon={Icon.Plug} target={<ConnectionView />} />
      <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
      <Action
        title="Open Edits"
        icon={Icon.AppWindow}
        onAction={async () => {
          const app = await findEdits();
          if (app) await openEdits(app);
        }}
      />
    </>
  );
  const projects =
    data?.projects.filter((project) => project.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())) ??
    [];
  return (
    <List
      isLoading={loading || busy}
      filtering={false}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search Edits projects…"
    >
      <List.EmptyView
        title={error?.title ?? (loading ? "Loading projects…" : "No projects found")}
        description={error?.message ?? "Create a project with media in Edits, then refresh."}
        icon={error ? Icon.ExclamationMark : Icon.Video}
        actions={
          <ActionPanel>
            {commonActions}
            {error?.title === "Edits is not installed" && (
              <Action.OpenInBrowser title="Download Edits" url={DOWNLOAD_URL} />
            )}
          </ActionPanel>
        }
      />
      {data?.cloudRefreshTimedOut && (
        <List.Section>
          <List.Item
            title="Cloud refresh timed out"
            subtitle="Some projects may be missing. Refresh to try again."
            icon={Icon.ExclamationMark}
            actions={<ActionPanel>{commonActions}</ActionPanel>}
          />
        </List.Section>
      )}
      <List.Section title="Projects" subtitle="Return to Edits’ home screen to duplicate projects">
        {projects.map((project) => (
          <List.Item
            key={project.id}
            title={project.name}
            subtitle={project.duration}
            icon={Icon.Video}
            accessories={[
              ...(project.isPinned ? [{ icon: Icon.Pin, tooltip: "Pinned" }] : []),
              ...(project.isFavorite ? [{ icon: Icon.Star, tooltip: "Favorite" }] : []),
              ...(project.isCloudOnly ? [{ icon: Icon.Cloud, tooltip: "Cloud project" }] : []),
              ...(project.lastModified ? [{ text: project.lastModified, tooltip: "Last modified" }] : []),
            ]}
            actions={
              <ActionPanel>
                {!busy && (
                  <ActionPanel.Section>
                    {data?.available.openProject && (
                      <Action
                        title="Open Project"
                        icon={Icon.ArrowRight}
                        onAction={() => execute("openProject", project)}
                      />
                    )}
                    {data?.available.duplicateProject && (
                      <Action
                        title="Duplicate Project"
                        icon={Icon.CopyClipboard}
                        onAction={() => execute("duplicateProject", project)}
                        shortcut={{ modifiers: ["cmd"], key: "d" }}
                      />
                    )}
                    {data?.available.renameProject && (
                      <Action.Push
                        title="Rename Project"
                        icon={Icon.Pencil}
                        target={
                          <RenameProject
                            project={project}
                            onRename={(name) => execute("renameProject", project, name)}
                          />
                        }
                      />
                    )}
                    {data?.available.toggleFavorite && typeof project.isFavorite === "boolean" && (
                      <Action
                        title={project.isFavorite ? "Remove Favorite" : "Add Favorite"}
                        icon={Icon.Star}
                        onAction={() => execute("toggleFavorite", project)}
                      />
                    )}
                    {data?.available.togglePin && typeof project.isPinned === "boolean" && (
                      <Action
                        title={project.isPinned ? "Unpin Project" : "Pin Project"}
                        icon={Icon.Pin}
                        onAction={() => execute("togglePin", project)}
                      />
                    )}
                    <Action.CopyToClipboard title="Copy Project Reference" content={project.id} />
                  </ActionPanel.Section>
                )}
                <ActionPanel.Section>{commonActions}</ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
