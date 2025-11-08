import { ActionPanel, Action, Icon, List, Detail, getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";

interface Project {
  id: number;
  uid: string;
  name: string;
}

interface Tag {
  uid: string;
  name: string;
}

interface Note {
  id: number;
  uid: string;
  title: string;
  content: string;
  project_id?: number;
  tags?: Tag[];
}

export default function Command() {
  const preferences = getPreferenceValues<{ apiUrl: string; email: string; password: string }>();
  const [notes, setNotes] = useState<Note[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>("");

  useEffect(() => {
    async function loadData() {
      try {
        // Login to get session cookie
        const loginRes = await fetch(`${preferences.apiUrl}/api/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: preferences.email, password: preferences.password }),
        });
        if (!loginRes.ok) {
          throw new Error("Login failed");
        }
        const cookie = loginRes.headers.get("set-cookie");

        // Fetch projects
        const projectsRes = await fetch(`${preferences.apiUrl}/api/projects`, {
          headers: cookie ? { Cookie: cookie } : undefined,
        });
        if (projectsRes.ok) {
          const projectsData = (await projectsRes.json()) as { projects: Project[] };
          setProjects(projectsData.projects.filter((p: Project) => p && p.id != null && p.name));
        }

        // Fetch notes
        const notesRes = await fetch(`${preferences.apiUrl}/api/notes`, {
          headers: cookie ? { Cookie: cookie } : undefined,
        });
        if (notesRes.ok) {
          const notesData = (await notesRes.json()) as Note[];
          setNotes(notesData.filter((n: Note) => n && n.id != null && n.uid && n.title));
        }
      } catch (error) {
        console.error("Failed to load notes/projects:", error);
      }
    }

    loadData();
  }, [preferences.apiUrl, preferences.email, preferences.password]);

  const filteredNotes = notes.filter((note) => {
    if (!selectedProjectFilter) return true;
    if (selectedProjectFilter === "no-project") return !note.project_id;
    return note.project_id?.toString() === selectedProjectFilter;
  });

  return (
    <List
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Project" value={selectedProjectFilter} onChange={setSelectedProjectFilter}>
          <List.Dropdown.Item value="" title="All Projects" />
          <List.Dropdown.Item value="no-project" title="No Project" />
          {projects.map((project) => (
            <List.Dropdown.Item key={project.id} value={project.id.toString()} title={project.name} />
          ))}
        </List.Dropdown>
      }
    >
      {filteredNotes.map((note) => {
        const projectName = note.project_id ? projects.find((p) => p.id === note.project_id)?.name : "No Project";
        const tagsText = note.tags?.map((t) => t.name).join(", ") || "";
        return (
          <List.Item
            key={note.id}
            icon={Icon.Document}
            title={note.title}
            subtitle={note.content.length > 100 ? note.content.substring(0, 100) + "..." : note.content}
            accessories={[
              { icon: Icon.Folder, text: projectName },
              ...(tagsText ? [{ icon: Icon.Tag, text: tagsText }] : []),
            ]}
            actions={
              <ActionPanel>
                <Action.Push title="Open Details" target={<NoteDetail note={note} />} />
                <Action.CopyToClipboard content={note.content} title="Copy Note Content" />
                <Action.CopyToClipboard content={note.title} title="Copy Note Title" />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function NoteDetail({ note }: { note: Note }) {
  const preferences = getPreferenceValues<{ apiUrl: string; email: string; password: string }>();
  return (
    <Detail
      markdown={`# ${note.title}\n\n${note.content}`}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Browser" url={`${preferences.apiUrl}/note/${note.uid}`} />
          <Action.CopyToClipboard content={note.content} title="Copy Note Content" />
          <Action.CopyToClipboard content={note.title} title="Copy Note Title" />
        </ActionPanel>
      }
    />
  );
}
