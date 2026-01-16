import { ActionPanel, Action, List, showToast, Toast, Icon, popToRoot, Form, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";
import { listProjects, startTimer, getUsername } from "./lib/api";
import { Project } from "./lib/types";

// Optional note form before starting timer
function StartTimerForm({ project, onStart }: { project: Project; onStart: (note?: string) => void }) {
  const [note, setNote] = useState("");

  return (
    <Form
      navigationTitle={`Start Timer for ${project.description}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Start Timer" icon={Icon.Play} onSubmit={() => onStart(note.trim() || undefined)} />
          <Action title="Start Without Note" icon={Icon.Play} onAction={() => onStart()} />
        </ActionPanel>
      }
    >
      <Form.Description title="Project" text={project.description} />
      <Form.Description title="Client" text={project.client_name || "No Client"} />
      <Form.TextArea
        id="note"
        title="Note"
        placeholder="Add a note for this timer (optional)"
        value={note}
        onChange={setNote}
      />
    </Form>
  );
}

export default function StartTimerCommand() {
  const { push } = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects(search?: string) {
    setIsLoading(true);
    try {
      const result = await listProjects({ search, include_completed: false });
      if (result.result) {
        setProjects(result.projects);
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to load projects",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function handleSearchChange(text: string) {
    setSearchText(text);
    loadProjects(text);
  }

  async function handleStartTimer(project: Project, note?: string) {
    try {
      const username = getUsername();

      const result = await startTimer({
        project_id: project.id,
        username,
        note,
      });

      if (result.result && result.event) {
        await showToast({
          style: Toast.Style.Success,
          title: "Timer Started",
          message: `${project.description}${project.client_name ? ` (${project.client_name})` : ""}`,
        });
        await popToRoot();
      } else {
        throw new Error(result.error || "Failed to start timer");
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to start timer",
      });
    }
  }

  // Group projects by client
  const projectsByClient = projects.reduce(
    (acc, project) => {
      const clientName = project.client_name || "No Client";
      if (!acc[clientName]) {
        acc[clientName] = [];
      }
      acc[clientName].push(project);
      return acc;
    },
    {} as Record<string, Project[]>
  );

  const clientNames = Object.keys(projectsByClient).sort();

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search projects..."
      onSearchTextChange={handleSearchChange}
      throttle
    >
      {clientNames.map((clientName) => (
        <List.Section key={clientName} title={clientName}>
          {projectsByClient[clientName].map((project) => (
            <List.Item
              key={project.id}
              title={project.description}
              subtitle={project.category || undefined}
              accessories={[
                project.is_billable ? { tag: { value: "Billable", color: "#4CAF50" } } : { text: "" },
                project.rate ? { text: `$${project.rate}/hr` } : { text: "" },
              ].filter((a) => a.text !== "" || a.tag)}
              actions={
                <ActionPanel>
                  <Action title="Start Timer" icon={Icon.Play} onAction={() => handleStartTimer(project)} />
                  <Action
                    title="Start Timer with Note"
                    icon={Icon.Pencil}
                    onAction={() =>
                      push(<StartTimerForm project={project} onStart={(note) => handleStartTimer(project, note)} />)
                    }
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
      {!isLoading && projects.length === 0 && (
        <List.EmptyView
          title="No Projects Found"
          description={searchText ? "Try a different search term" : "Create a project first"}
        />
      )}
    </List>
  );
}
