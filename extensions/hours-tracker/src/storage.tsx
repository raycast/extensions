import { Topic, TrackEntry } from "./types";
import { environment } from "@raycast/api";

import fs from "fs";

export enum DATE_RANGE {
  TODAY,
  WEEK,
  MONTH,
  ALL_TIME,
}
export enum STORAGE_OBJECTS {
  TOPICS,
}

const SUPPORT_PATH = environment.supportPath;
const TOPICS_PATH = `${SUPPORT_PATH}/topics.json`;

const trackEntryPath = (topicName: string) => `${SUPPORT_PATH}/${topicName}.json`;
const entriesPath = (topicName: string) => `${SUPPORT_PATH}/entries_${topicName}.json`;

const getDefaultTopics = (): Topic[] => {
  return [{ name: "Work", createdAt: Date.now() }];
};

const STORAGE_OBJECT_PATHS_MAP = new Map([
  [STORAGE_OBJECTS.TOPICS, { path: TOPICS_PATH, defaultContent: JSON.stringify(getDefaultTopics()) }],
]);

export function ensureStorageObjectsExist(objects: STORAGE_OBJECTS[]): boolean {
  for (const storageObject of Object.values(objects)) {
    const obj = STORAGE_OBJECT_PATHS_MAP.get(storageObject);
    if (obj === undefined) {
      console.error(`Error getting object ${storageObject}`);
      return false;
    }
    const { path, defaultContent } = obj;

    try {
      fs.accessSync(path);
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === "ENOENT") {
        try {
          fs.writeFileSync(path, defaultContent);
        } catch (writeError) {
          console.error(`Error creating file ${path}: ${writeError}`);
          throw writeError;
        }
      } else {
        console.error(`Error checking file ${path}: ${error}`);
        return false;
      }
    }
  }

  return true;
}

export function getTopics(): Topic[] | null {
  try {
    const contents = fs.readFileSync(TOPICS_PATH);
    const topics = JSON.parse(contents.toString());
    return topics;
  } catch (err) {
    console.error(err);
    return null;
  }
}

export function getTopic(topicName: string): Topic | null {
  const topics = getTopics();
  if (topics === null) {
    return null;
  }

  const topic = topics.find((t) => t.name === topicName);

  if (topic === undefined) {
    return null;
  }

  return topic;
}

export function getTrackEntry(topicName: string): TrackEntry | null {
  try {
    if (!fs.existsSync(trackEntryPath(topicName))) {
      return null;
    }

    const contents = fs.readFileSync(trackEntryPath(topicName));
    const entry = JSON.parse(contents.toString());
    return entry;
  } catch (err) {
    console.error(err);
    return null;
  }
}

export function getEntriesForTopic(topicName: string, startDate: Date | null, endDate: Date | null): TrackEntry[] {
  try {
    if (!fs.existsSync(entriesPath(topicName))) {
      return [];
    }

    const contents = fs.readFileSync(entriesPath(topicName));
    const entries = JSON.parse(contents.toString());

    return entries.filter((entry: TrackEntry) => {
      const entryDate = new Date(entry.startTime);

      if (startDate === null || endDate === null) {
        return true;
      }

      if (startDate == null) {
        return entryDate <= endDate;
      }

      if (endDate == null) {
        return entryDate >= startDate;
      }

      return entryDate >= startDate && entryDate <= endDate;
    });
  } catch (err) {
    console.error(err);
    return [];
  }
}

export function deleteEntry(entry: TrackEntry, topicName: string): boolean {
  try {
    const entries = getEntriesForTopic(topicName, null, null);
    const newEntries = entries.filter((e) => e.startTime !== entry.startTime);
    fs.writeFileSync(entriesPath(topicName), JSON.stringify(newEntries));
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
}

export function isTopicBeingTracked(topic: Topic): boolean {
  return fs.existsSync(trackEntryPath(topic.name));
}

export function stopTrackEntry(topic: Topic): boolean {
  try {
    const activeEntryPath = trackEntryPath(topic.name);
    let entries: TrackEntry[] = [];
    let entry = null;

    let contents = fs.readFileSync(activeEntryPath);
    entry = JSON.parse(contents.toString());
    entry.endTime = Date.now();

    if (fs.existsSync(entriesPath(topic.name))) {
      contents = fs.readFileSync(entriesPath(topic.name));
      entries = JSON.parse(contents.toString());
    }
    entries.push(entry);

    fs.writeFileSync(entriesPath(topic.name), JSON.stringify(entries));
    fs.unlinkSync(activeEntryPath);

    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
}

export function startTrackEntry(topic: Topic): boolean {
  try {
    const startTime = Date.now();
    const entry: TrackEntry = { startTime: startTime, endTime: null };

    fs.writeFileSync(trackEntryPath(topic.name), JSON.stringify(entry));
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
}

export function deleteTopic(topic: Topic, deleteAllEntries?: boolean): boolean {
  let deletedTopicFile = false;

  try {
    const topics = getTopics();
    if (topics === null) {
      return false;
    }

    const newTopics = topics.filter((t) => t.name !== topic.name);

    if (newTopics.length === 0) fs.unlinkSync(TOPICS_PATH);
    else fs.writeFileSync(TOPICS_PATH, JSON.stringify(newTopics));

    deletedTopicFile = true;

    if (deleteAllEntries && fs.existsSync(entriesPath(topic.name))) {
      console.log("Deleting all entries");
      fs.unlinkSync(entriesPath(topic.name));
    }

    return true;
  } catch (err) {
    if (deletedTopicFile && deleteAllEntries) {
      console.error("Error deleting all entries");
    }
    console.error(err);
    return false;
  }
}

export function addTopic(topic: Topic): boolean {
  try {
    const topics = getTopics();
    if (topics === null) {
      return false;
    }

    topics.push(topic);
    fs.writeFileSync(TOPICS_PATH, JSON.stringify(topics));
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
}
