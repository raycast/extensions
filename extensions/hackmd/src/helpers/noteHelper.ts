import { Note } from "@hackmd/api/dist/type";
import url from "url";
import { getPreferences } from "../lib/preference";

const { instance_url } = getPreferences();

export const getNoteUrl = (note: Note): string => {
  const namePath = note.userPath || note.teamPath;
  const noteUrl = new url.URL(`@${namePath}/${note.permalink || note.id}`, instance_url).toString();

  return noteUrl;
};
