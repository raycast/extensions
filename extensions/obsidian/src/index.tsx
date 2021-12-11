import { List, ActionPanel, OpenAction, getPreferenceValues, CopyToClipboardAction, PasteAction, PushAction, Detail, Form, SubmitFormAction, useNavigation, Icon, showToast, ToastStyle } from "@raycast/api";
import { useEffect, useState } from "react";
const fs = require("fs")
const path = require("path")

interface Note{
  title: string;
  key: number;
  path: string;
}

interface Preferences{
  vaultPath: string;
  excludedFolders: string;
  removeYAML: boolean;
  removeLinks: boolean;
}

interface FormValue{
  content: string;
}

function isValidFile(file: string, exFolders:Array<string>){
  for (let folder of exFolders){
    if (file.includes(folder)){
      return false;
    }
  }
  return true;
}

const getFilesHelp = function(dirPath: string, exFolders: Array<string>, arrayOfFiles: Array<string>) {
  let files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];
    files.forEach(function(file: string) {
      let next = fs.statSync(dirPath + "/" + file);
        if (next.isDirectory()) {
          arrayOfFiles = getFilesHelp(dirPath + "/" + file, exFolders, arrayOfFiles);
        } else {
          if (file.endsWith(".md") && file !== ".md" && !dirPath.includes(".obsidian") && isValidFile(dirPath, exFolders)){
            arrayOfFiles.push(path.join(dirPath, "/", file));
          }
        }
  })
  return arrayOfFiles;
}

function getFiles(){
  const pref: Preferences = getPreferenceValues();
  let vaultPath = pref.vaultPath;
  let exFolders = prefExcludedFolders();

  const files = getFilesHelp(vaultPath.toString(), exFolders, []);
  return files;
}

function prefExcludedFolders(){
  const pref: Preferences = getPreferenceValues();
  let foldersString = pref.excludedFolders;
  if (foldersString){
    let folders = foldersString.split(",");
    for(let i = 0; i < folders.length; i++){
      folders[i] = folders[i].trim();
    }
    return folders;
  }else{
    return [];
  }
}

function noteJSON(files: Array<string>){
  let notes: Note[] = [];

  let key = 0;
  for (let f of files){
  
      let comp = f.split("/");
      let f_name = comp.pop();
      let name = "default";
      if (f_name){
        name = f_name.split(".md")[0];
      }
      let note = {
        "title": name,
        "key": ++key,
        "path": f
      };
      notes.push(note);
    }
  return JSON.stringify(notes);
}

function getNoteContent(note: Note){
  const pref: Preferences = getPreferenceValues();

  let content = fs.readFileSync(note.path,'utf8') as string;
  if (pref.removeYAML){
    let yamlHeader = content.match(/---(.|\n)*?---/gm);
    if (yamlHeader){
      content = content.replace(yamlHeader[0], "");
    }
  }
  if (pref.removeLinks){
    content = content.replaceAll("[[", "");
    content = content.replaceAll("]]", "");
  }
  return content;
}

function NoteQuickLook(props: {note: Note}){
  let note = props.note;
  let content = getNoteContent(note);
  return <Detail markdown={content} />;
}


function NoteForm(props: {note: Note}){
  let note = props.note;
  const { pop } = useNavigation();

  function addTextToNote(text:FormValue){
    fs.appendFileSync(note.path, "\n\n" + text.content);
    showToast(ToastStyle.Success, "Added text to note")
    pop();
  }

  return (
    <Form 
      navigationTitle={"Add text to: " + note.title}
      actions={
        <ActionPanel>
          <SubmitFormAction title="Submit" onSubmit={addTextToNote} />
        </ActionPanel>
      }
    >
      
      <Form.TextArea 
        title={"Add text to:\n" + note.title}
        id="content" 
        placeholder={"Text"} 
      />

    </Form>
  );
}


export default function Command() {

  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    async function fetch() {

      let files = getFiles();
      let json = noteJSON(files);
      setNotes(JSON.parse(json));
    }
    fetch();
  }, []);

  return (
    <List isLoading={notes === undefined}>
      {notes.map((note) => (
        <List.Item title={note.title} key={note.key} actions={
          <ActionPanel>

            <PushAction 
              title="Quick Look" 
              target={
                <NoteQuickLook note={note}/>
              } 
              icon={Icon.Eye}  
            />

            <OpenAction 
              title="Open in Obsidian" 
              target={"obsidian://open?path=" + encodeURIComponent(note.path)}
            />

            <PushAction 
              title="Append to note" 
              target={
                <NoteForm note={note} />
              }
              shortcut={{modifiers: ["cmd", "shift"], key: "a"}}
              icon={Icon.Pencil}
            />

            <CopyToClipboardAction
              title="Copy note content"
              content={getNoteContent(note)}
              shortcut={{ modifiers: ["opt"], key: "c"}}
            />

            <PasteAction 
              title="Paste note content" 
              content={getNoteContent(note)} 
              shortcut={{ modifiers: ["opt"], key: "v"}}
            />
          </ActionPanel>
        }/>
      ))}
    </List>
    );
}
