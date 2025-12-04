import { getPreferences, InstallationSource } from "./preferences";
import { parse as parsePath } from "path";
import { homedir } from "os";
import { formatRelative, parse as parseDate } from "date-fns";
import { readFileSync } from "fs";
import { sync as find } from "fast-glob";
import { enGB } from "date-fns/locale";
import { capitalize } from "lodash";
import { Icon } from "@raycast/api";

function getNotePlan3URI() {
  const appstorePath = `${homedir()}/Library/Containers/co.noteplan.NotePlan3/Data/Library/Application Support/co.noteplan.NotePlan3`;
  const setappPath = `${homedir()}/Library/Containers/co.noteplan.NotePlan-setapp/Data/Library/Application Support/co.noteplan.NotePlan-setapp`;

  if (getPreferences().installationSource == InstallationSource.SetApp) {
    return setappPath;
  }
  return appstorePath;
}
const NOTE_PLAN_URI = getNotePlan3URI();
const X_CALLBACK = "noteplan://x-callback-url";

export enum NoteType {
  Calendar = "calendar",
  Project = "project",
}

export interface NoteEntry {
  relativePath: string;
  fileName: string;
  type: NoteType;
  callbackPath: string;
}

export interface Note {
  entry: NoteEntry;
  content: string;
}

export const xCallbackToOpenNoteByPath = (noteEntry: NoteEntry) =>
  `${X_CALLBACK}/openNote?filename=${encodeURIComponent(noteEntry.callbackPath)}`;

const getNoteEntry = (path: string): NoteEntry => {
  const relativePath = path.replace(NOTE_PLAN_URI, "");
  const parsedRelativePath = parsePath(relativePath);
  const fileName = parsedRelativePath.name;

  const type = parsedRelativePath.dir.startsWith("/Notes") ? NoteType.Project : NoteType.Calendar;
  const typePrefix = type == NoteType.Project ? "/Notes/" : "/Calendar/";
  const callbackPath = relativePath.replace(typePrefix, "");

  return {
    relativePath,
    callbackPath,
    fileName,
    type,
  };
};

export const listNotes = (): NoteEntry[] => {
  const paths = find(`${NOTE_PLAN_URI}/{Calendar,Notes}/**/*.${getPreferences().fileExtension}`, { absolute: true });
  return paths.map(getNoteEntry);
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
    if (note.fileName.match(/^\d{4}-W\d{1,2}$/)) {
      const parts = note.fileName.split("-W");
      return `Week: W${parts[1]}, ${parts[0]}`;
    }
    if (note.fileName.match(/^\d{4}-\d{1,2}$/)) {
      const parts = note.fileName.split("-");
      const month = Intl.DateTimeFormat("en", { month: "long" }).format(new Date(parts[1]));
      return `Month: ${month} ${parts[0]}`;
    }
    if (note.fileName.match(/^\d{4}-Q\d$/)) {
      const parts = note.fileName.split("-Q");
      return `Quarter: Q${parts[1]} ${parts[0]}`;
    }
    if (note.fileName.match(/^\d{4}$/)) {
      return `Year: ${note.fileName}`;
    }
    const date = parseDate(note.fileName, "yyyyMMdd", new Date());
    try {
      return formatRelative(date, new Date(), {
        locale: {
          ...enGB,
          formatRelative: (token: keyof typeof formatRelativeLocale) => formatRelativeLocale[token],
        },
      });
    } catch (err) {
      // fall through to default
    }
  }

  return note.fileName;
};

export const getNoteCategory = (note: NoteEntry) => capitalize(note.type);

export const getNoteIcon = (note: NoteEntry) => (note.type == NoteType.Project ? Icon.TextDocument : Icon.Calendar);
