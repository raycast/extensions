import { parse as parsePath } from "path";
import { homedir } from "os";
import { formatRelative, parse as parseDate } from "date-fns";
import { readFileSync } from "fs";
import { sync as find } from "fast-glob";
import { enGB } from "date-fns/locale";
import { capitalize } from "lodash";
import { Icon } from "@raycast/api";

const NOTE_PLAN_URI = `${homedir()}/Library/Containers/co.noteplan.NotePlan3/Data/Library/Application Support/co.noteplan.NotePlan3`;

export enum NoteType {
  Calendar = "calendar",
  Project = "project",
}

export interface NoteEntry {
  relativePath: string;
  fileName: string;
  type: NoteType;
}

export interface Note {
  entry: NoteEntry;
  content: string;
}

export const listNotes = (): NoteEntry[] => {
  const paths = find(`${NOTE_PLAN_URI}/**/*.txt`, { absolute: true });

  return paths.map((path) => {
    const relativePath = path.replace(NOTE_PLAN_URI, "");
    const parsedRelativePath = parsePath(relativePath);
    const fileName = parsedRelativePath.name;

    const type = parsedRelativePath.dir.startsWith("/Notes") ? NoteType.Project : NoteType.Calendar;

    return {
      relativePath,
      fileName,
      type,
    };
  });
};

export const readNote = ({ entry }: { entry: NoteEntry }): Note => {
  const content = readFileSync(`${NOTE_PLAN_URI}/${entry.relativePath}`, { encoding: "utf-8" });

  return {
    entry,
    content,
  };
};

export const getNoteTitle = (note: NoteEntry) => {
  const formatRelativeLocale = {
    lastWeek: "'Last' eeee, EEEE, MMMM do yyyy",
    yesterday: "'Yesterday', EEEE, MMMM do yyyy",
    today: "'Today', EEEE, MMMM do yyyy",
    tomorrow: "'Tomorrow', EEEE, MMMM do yyyy",
    nextWeek: "'Next' eeee, EEEE, MMMM do yyyy",
    other: "EEEE, MMMM do yyyy",
  };

  if (note.type == NoteType.Calendar) {
    const date = parseDate(note.fileName, "yyyyMMdd", new Date());
    return formatRelative(date, new Date(), {
      locale: {
        ...enGB,
        formatRelative: (token: keyof typeof formatRelativeLocale) => formatRelativeLocale[token],
      },
    });
  }

  return note.fileName;
};

export const getNoteCategory = (note: NoteEntry) => capitalize(note.type);

export const getNoteIcon = (note: NoteEntry) => (note.type == NoteType.Project ? Icon.TextDocument : Icon.Calendar);
