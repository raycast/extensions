import React, { useEffect, useState } from "react";
import { Action, ActionPanel, Color, Detail, Icon, List, showToast, Toast } from "@raycast/api";
import { Note } from "./note";
import EditAction from "./edit-note";
import { getNotes, saveNotes } from "./notes-store";
import AddAction from "./create-note";

export default function ViewNotes() {
  const [allNotes, setNotes] = useState<Note[]>([]);
  const [error, setError] = useState<Error | unknown>();
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    setLoading(true);
    try {
      (async () => {
        setLoading(true);
        setNotes(await getNotes());
      })();
    } catch (e) {
      setError(e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }, [error]);

  async function handleEdit(editedCard: Note, index: number) {
    try {
      const allNotes: Note[] = await getNotes();
      allNotes.splice(index, 1, editedCard);

      await saveNotes(allNotes);
      setNotes(await getNotes());
    } catch (e) {
      setError(e);
    }
  }



  async function clip(note: Note, index: number) {
    try {
      const allNotes: Note[] = await getNotes();
      note.clipped = true;
      allNotes.splice(index, 1, note);

      await saveNotes(allNotes);
      setNotes(await getNotes());
    } catch (e) {
      setError(e);
    }
  }

  async function unClip(note: Note, index: number) {
    try {
      const allNotes: Note[] = await getNotes();
      note.clipped = false;
      allNotes.splice(index, 1, note);

      await saveNotes(allNotes);
      setNotes(await getNotes());
    } catch (e) {
      setError(e);
    }
  }
  async function handleDelete(index: number) {
    try {
      const allNotes: Note[] = await getNotes();
      allNotes.splice(index, 1);

      await saveNotes(allNotes);
      setNotes(await getNotes());
    } catch (e) {
      setError(e);
    }
  }

  function detailsWithList(note: Note) {
    let markdown = `🔖 *Tag :*`;
    if(note.tag !== "") {
      markdown += ` *${note.tag}*`;
    }
    markdown += `\n\n---\n\n`;
    markdown += `\n\n## ${note.title}`;
    markdown += `\n\n${note.description}`;
    return markdown;

  }

  function markdown(note: Note) {
    let markdown = ``;
    if (note.clipped) {
      markdown += `📎\t`;
    }
    markdown += `🔖 *Tag :*`;
    if(note.tag !== "") {
      markdown += ` *${note.tag}*`;
    }
    markdown += `\t\t\t\t\t\t🗓️ *Created on : ${note.createdOn}*`;
    markdown += `\n\n---\n\n`;
    markdown += `\n\n## ${note.title}`;
    markdown += `\n\n${note.description}`;
    return markdown;
  }


  function AddNewNoteAction() {
    return (
      <Action.Push
        icon={{ source: Icon.Plus, tintColor: Color.Green }}
        title="Create Note"
        shortcut={{ modifiers: ["cmd"], key: "n" }}
        target={<AddAction setNotes={setNotes} />}
      />
    );
  }

  function accessories(note: Note)  {
    const list: List.Item.Props["accessories"] = [];
    if (note.clipped) {
      list.push({ tooltip: "Pinned", icon: {source: Icon.Paperclip ,tintColor: Color.Blue }});
    }
    return list;
  }

  return (
    <List isLoading={loading} isShowingDetail={true}>
      {allNotes.map((note, index) => (
        <List.Item
          key={index}
          title={note.title}
          accessories={accessories(note)}
          keywords={[note.tag, note.title, note.description]}
          detail={<List.Item.Detail markdown={detailsWithList(note)}/>}
          actions={
            <ActionPanel>
              <Action.Push
                title="Show Details"
                icon={{ source: Icon.Document, tintColor: Color.PrimaryText }}
                target={<Detail markdown={markdown(note)} />}
              />
              <EditAction
                note={note}
                onEdit={(updatedNote) => handleEdit(updatedNote, index)}
              />
              {note.clipped === false ? (
                <Action
                  icon={{ source: Icon.Paperclip, tintColor: Color.Blue }}
                  onAction={() => clip(note,index)}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                  title="Clip Note"
                />
              ) : (
                <Action
                  icon={{ source: Icon.Paperclip, tintColor: Color.Blue }}
                  onAction={() => unClip(note,index)}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                  title="Unclip Note"
                />
              )}
              <Action
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                title="Delete Note"
                onAction={() => handleDelete(index)}
                shortcut={{ modifiers: ["cmd","shift"], key: "backspace" }}
              />
              <AddNewNoteAction/>
            </ActionPanel>
          }
        />
      ))}
      <List.Item
        title={"Add New Note"}
        icon={{ source: Icon.Plus, tintColor: Color.Green }}
        detail={<List.Item.Detail markdown={"---\n## Add New Note\n---"}/>}
        actions={<ActionPanel><AddNewNoteAction/></ActionPanel>}
      />
    </List>
  );
}
