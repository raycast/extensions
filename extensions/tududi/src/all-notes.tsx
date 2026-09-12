import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { fetchNotes, fetchProjects, getWebUrl } from "./lib/api";
import type { Note } from "./lib/types";

export default function Command() {
  const [selectedProjectFilter, setSelectedProjectFilter] = useState("");
  const { data: notes = [], isLoading: notesLoading, error } = useCachedPromise(fetchNotes);
  const { data: projects = [], isLoading: projectsLoading } = useCachedPromise(fetchProjects);

  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      if (!selectedProjectFilter) return true;
      if (selectedProjectFilter === "no-project") return !note.project_id;
      return note.project_id?.toString() === selectedProjectFilter;
    });
  }, [notes, selectedProjectFilter]);

  if (error) {
    return (
      <List>
        <List.EmptyView icon={Icon.Warning} title="Failed to load notes" description={(error as Error).message} />
      </List>
    );
  }

  return (
    <List
      isLoading={notesLoading || projectsLoading}
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
      {filteredNotes.length === 0 && !notesLoading ? (
        <List.EmptyView icon={Icon.Document} title="No notes found" />
      ) : (
        filteredNotes.map((note) => {
          const projectName =
            note.Project?.name ||
            (note.project_id ? projects.find((p) => p.id === note.project_id)?.name : undefined) ||
            "No Project";
          const tags = note.tags ?? [];
          const tagsText = tags.map((t) => t.name).join(", ");
          const preview = note.content.length > 100 ? `${note.content.substring(0, 100)}...` : note.content;

          return (
            <List.Item
              key={note.uid}
              icon={Icon.Document}
              title={note.title}
              subtitle={preview}
              accessories={[
                { icon: Icon.Folder, text: projectName },
                ...(tagsText ? [{ icon: Icon.Tag, text: tagsText }] : []),
              ]}
              actions={
                <ActionPanel>
                  <Action.Push title="Open Details" target={<NoteDetail note={note} />} />
                  <Action.OpenInBrowser title="Open in Browser" url={getWebUrl(`/note/${note.uid}`)} />
                  <Action.CopyToClipboard content={note.content} title="Copy Note Content" />
                  <Action.CopyToClipboard content={note.title} title="Copy Note Title" />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}

function NoteDetail({ note }: Readonly<{ note: Note }>) {
  return (
    <Detail
      markdown={`# ${note.title}\n\n${note.content}`}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Browser" url={getWebUrl(`/note/${note.uid}`)} />
          <Action.CopyToClipboard content={note.content} title="Copy Note Content" />
          <Action.CopyToClipboard content={note.title} title="Copy Note Title" />
        </ActionPanel>
      }
    />
  );
}
