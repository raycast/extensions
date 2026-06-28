import { Action, ActionPanel, Alert, Color, Detail, Icon, List, confirmAlert } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useState } from "react";

import { useSites } from "./hooks/use-sites";
import { Validation } from "./layouts/Validation";
import { NoteVisibility, cn, type Note } from "./utils/collected-notes";

export default function Command() {
  const { currentSite, setCurrentSite, sites, sitesAreLoading, getSiteById } = useSites();

  const [listIsLoading, setListIsLoading] = useState(false);

  return (
    <Validation>
      <List
        isLoading={sitesAreLoading || listIsLoading || !currentSite}
        navigationTitle="Collected Notes"
        searchBarPlaceholder="Search Posts"
        searchBarAccessory={
          <List.Dropdown
            placeholder="Select site"
            tooltip="Select site"
            storeValue={true}
            isLoading={sitesAreLoading}
            onChange={setCurrentSite}
          >
            {sites?.map((site) => (
              <List.Dropdown.Item key={site.id} title={site.name} value={String(site.id)} keywords={[site.site_path]} />
            ))}
          </List.Dropdown>
        }
      >
        {currentSite && (
          <SiteNotesList site={getSiteById(currentSite)?.site_path} setListIsLoading={setListIsLoading} />
        )}
      </List>
    </Validation>
  );
}

function SiteNotesList({ site, setListIsLoading }: { site?: string; setListIsLoading: (isLoading: boolean) => void }) {
  if (!site) return null;

  const { data, isLoading, revalidate } = usePromise<(site_path: string) => ReturnType<typeof cn.site>>(
    (s) => cn.site(s),
    [site],
  );

  useEffect(() => {
    setListIsLoading(isLoading);
  }, [isLoading]);

  return data?.notes?.map((note) => (
    <List.Item
      key={note.id}
      title={note.title}
      subtitle={note.headline}
      actions={
        <NoteActionsPanel
          note={note}
          onNoteUpdate={async (updatedNote: { body: string; visibility: NoteVisibility }) => {
            await cn.update(data.site.site_path, String(note.id), updatedNote);
          }}
          onDelete={async () => {
            if (
              await confirmAlert({
                title: "Are you sure?",
                message: `This will delete the note\n"${note.title}"`,
                icon: { source: Icon.Trash, tintColor: Color.Red },
                primaryAction: {
                  title: "Delete",
                  style: Alert.ActionStyle.Destructive,
                },
              })
            ) {
              await cn.destroy(data.site.site_path, String(note.id));
              await revalidate();
            }
          }}
        />
      }
    />
  ));
}

function NoteActionsPanel(params: {
  note: Note;
  onNoteUpdate: (updatedNote: { body: string; visibility: NoteVisibility }) => void;
  onDelete: () => void;
}) {
  const { note, onNoteUpdate, onDelete } = params;

  return (
    <ActionPanel>
      <Action.Push
        title="Show Details"
        icon={Icon.Info}
        target={
          <Detail
            markdown={note.body.replace(/^---[\s\S]*?---\s/g, "")}
            actions={
              <ActionPanel>
                <DetailActions note={note} onNoteUpdate={onNoteUpdate} onDelete={onDelete} />
              </ActionPanel>
            }
            metadata={
              <Detail.Metadata>
                <Detail.Metadata.Label title="Visibility" text={note.visibility} />
                <Detail.Metadata.Label title="Created at" text={new Date(note.created_at).toLocaleDateString()} />
                <Detail.Metadata.Label title="Updated at" text={new Date(note.updated_at).toLocaleDateString()} />
                {/* // TODO: Add Metadata from frontmatter (tags, etc.) */}
              </Detail.Metadata>
            }
          />
        }
      />
      <DetailActions note={note} onNoteUpdate={onNoteUpdate} onDelete={onDelete} />
    </ActionPanel>
  );
}

function DetailActions(params: {
  note: Note;
  onNoteUpdate: (updatedNote: { body: string; visibility: NoteVisibility }) => void;
  onDelete: () => void;
}) {
  const { note, onDelete } = params;

  const [visibility, setVisibility] = useState(note.visibility);

  useEffect(() => {
    setVisibility(note.visibility);
  }, [note.visibility]);

  useEffect(() => {
    params.onNoteUpdate({ body: note.body, visibility });
  }, [visibility]);

  return (
    <>
      <Action.OpenInBrowser title="View Note" url={note.url} />
      <Action.OpenInBrowser
        title="Edit Note"
        url={`https://collectednotes.com/sites/${note.site_id}/notes/${note.id}/edit`}
        shortcut={{ modifiers: ["cmd"], key: "e" }}
      />
      <Action.CopyToClipboard
        title="Copy URL"
        content={note.url}
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
      />
      <ActionPanel.Submenu title="Set Visibility" icon={Icon.Eye} shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}>
        <Action
          icon={{
            source: visibility === "public_site" ? Icon.CircleFilled : Icon.Circle,
            tintColor: Color.Blue,
          }}
          title="Public in Site"
          onAction={() => {
            setVisibility("public_site");
          }}
        />
        <Action
          icon={{ source: visibility === "public" ? Icon.CircleFilled : Icon.Circle, tintColor: Color.Green }}
          title="Public"
          onAction={() => {
            setVisibility("public");
          }}
        />
        <Action
          icon={{
            source: visibility === "public_unlisted" ? Icon.CircleFilled : Icon.Circle,
            tintColor: Color.Yellow,
          }}
          title="Unlisted"
          onAction={() => {
            setVisibility("public_unlisted");
          }}
        />
        <Action
          icon={{ source: visibility === "private" ? Icon.CircleFilled : Icon.Circle, tintColor: Color.Red }}
          title="Private"
          onAction={() => {
            setVisibility("private");
          }}
        />
      </ActionPanel.Submenu>
      <Action title="Delete Note" icon={Icon.Trash} shortcut={{ modifiers: ["ctrl"], key: "x" }} onAction={onDelete} />
    </>
  );
}
