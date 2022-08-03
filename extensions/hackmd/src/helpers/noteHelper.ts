import { Note, NotePublishType } from "@hackmd/api/dist/type";
import url from "url";
import { getPreferences } from "../lib/preference";

const { instance_url } = getPreferences();

const modeAlias: Record<NotePublishType, string> = {
  view: "s",
  slide: "p",
  edit: "",
  book: "c",
};

export const getNoteUrl = (note: Note): string => {
  const namePath = note.userPath || note.teamPath;

  if (namePath) {
    return new url.URL(`@${namePath}/${note.permalink || note.shortId}`, instance_url).toString();
  } else {
    const mode = modeAlias[note.publishType];

    if (mode) {
      return new url.URL(`${mode}/${note.shortId}`, instance_url).toString();
    } else {
      return new url.URL(note.shortId, instance_url).toString();
    }
  }
};
