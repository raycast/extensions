import dayjs, { Dayjs } from "dayjs";
import { JSONPreset } from "lowdb/node";
import path from "path";
import { nanoid } from "nanoid";
import { getPreferences } from "./preferences";

export enum EntryType {
  Meeting = "Meeting",
  Note = "Note",
  Blocker = "Blocker",
}

export type Entry = {
  datetime: Date;
  notes: string;
  id: string;
  type: EntryType;
  description?: string;
};

export type Data = {
  days: Record<string, Record<string, Entry>>;
};

export const FORMAT_KEY = "YYYY-MM-DD";

const defaultData: Data = { days: {} };

export async function getDB() {
  const prefs = getPreferences();
  return JSONPreset<Data>(path.join(prefs.notesDirectory, "database.json"), defaultData);
}

interface EntryInput {
  notes: string;
  date?: Date;
  type?: EntryType;
  description?: string;
}

export async function updateEntry(id: string, entry: EntryInput) {
  const db = await getDB();
  const days = db.data.days;

  for (const day in days) {
    const entries = days[day];
    const existing = entries[id];

    if (existing) {
      const type = entry.type ? entry.type : existing.type;
      const datetime = entry.date ? entry.date : existing.datetime;

      entries[id] = {
        ...entry,
        datetime,
        id,
        type,
      };
    }
  }

  await db.write();
}

export async function addEntry(entry: EntryInput) {
  const id = nanoid();
  const type = entry.type ? entry.type : EntryType.Note;
  const datetime = entry.date ? entry.date : new Date();
  const dateTimeDayJS = dayjs(datetime);
  const current = dateTimeDayJS.format(FORMAT_KEY);
  const db = await getDB();
  const existing = db.data.days[current];

  const newEntry: Entry = {
    ...entry,
    datetime,
    id,
    type,
  };

  if (existing) {
    db.data.days[current] = {
      ...existing,
      [id]: newEntry,
    };
  } else {
    db.data.days[current] = {
      [id]: newEntry,
    };
  }

  await db.write();
}

export async function getDaysByDateDescending(): Promise<Data> {
  const db = await getDB();
  return sortData(db.data);
}

export async function deleteEntry(id: string) {
  const db = await getDB();
  const days = db.data.days;

  for (const day in days) {
    const entries = days[day];
    delete entries[id];
  }
  await db.write();
}

const sortData = (data: Data): Data => {
  // Create a new plain object
  const sortedData: Data = { days: {} };

  // Get days keys and sort them using Day.js in descending order
  const sortedDays = Object.keys(data.days).sort((a, b) => dayjs(b).unix() - dayjs(a).unix());

  // Iterate over each sorted day
  for (const day of sortedDays) {
    // Get entries keys and sort them based on datetime value in descending order
    const sortedEntries = Object.keys(data.days[day]).sort(
      (a, b) => new Date(data.days[day][b].datetime).getTime() - new Date(data.days[day][a].datetime).getTime(),
    );

    sortedData.days[day] = {};

    // Assign each sorted entry to the new data object
    for (const entry of sortedEntries) {
      sortedData.days[day][entry] = data.days[day][entry];
    }
  }

  return sortedData;
};

export async function deleteAllForDay(date: Dayjs) {
  const db = await getDB();
  const day = date.format(FORMAT_KEY);
  delete db.data.days[day];
  await db.write();
}
