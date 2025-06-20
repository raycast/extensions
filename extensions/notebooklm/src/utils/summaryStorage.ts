import { LocalStorage } from "@raycast/api";
import { Notebook } from "../types";

const STORAGE_KEY = "summaryStorage";

export type NoteToSourceMap = Record<string, string[]>;
export type SourceDataMap = Record<string, { content: string }>;

type SummaryStorageData = {
  summaries: SourceDataMap;
  noteToSourceMap: NoteToSourceMap;
};

async function loadData(): Promise<SummaryStorageData> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  return raw ? JSON.parse(raw) : { summaries: {}, noteToSourceMap: {} };
}

async function saveData(data: SummaryStorageData): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export async function deleteRemovedSummary(notebooks: Notebook[]): Promise<string[]> {
  const data = await loadData();
  const { summaries, noteToSourceMap } = data;

  const validNotebookIds = new Set(notebooks.map((nb) => nb.id));
  const validSourceIds = new Set(notebooks.flatMap((nb) => nb.sources.map((src) => src.id)));

  const sourcesToDelete = Object.keys(summaries).filter((id) => !validSourceIds.has(id));
  const notebooksToDelete = Object.keys(noteToSourceMap).filter((id) => !validNotebookIds.has(id));

  if (sourcesToDelete.length === 0 && notebooksToDelete.length === 0) {
    return [];
  }

  sourcesToDelete.forEach((id) => delete summaries[id]);
  notebooksToDelete.forEach((id) => delete noteToSourceMap[id]);

  for (const noteId of Object.keys(noteToSourceMap)) {
    const originalSources = noteToSourceMap[noteId] || [];
    const cleanedSources = originalSources.filter((sourceId) => !sourcesToDelete.includes(sourceId));

    if (cleanedSources.length < originalSources.length) {
      if (cleanedSources.length > 0) {
        noteToSourceMap[noteId] = cleanedSources;
      } else {
        delete noteToSourceMap[noteId];
      }
    }
  }

  await saveData(data);

  return sourcesToDelete;
}

export async function getSummaries(): Promise<SourceDataMap> {
  const { summaries } = await loadData();
  return summaries;
}

export async function deleteAllSummaries(): Promise<void> {
  await saveData({ summaries: {}, noteToSourceMap: {} });
}

export async function deleteSummary(noteId: string, sourceId: string): Promise<void> {
  const data = await loadData();

  if (data.noteToSourceMap[noteId]) {
    data.noteToSourceMap[noteId] = data.noteToSourceMap[noteId].filter((id) => id !== sourceId);
    if (data.noteToSourceMap[noteId].length === 0) {
      delete data.noteToSourceMap[noteId];
    }
  }

  delete data.summaries[sourceId];

  await saveData(data);
}

export async function addSummary(noteId: string, sourceId: string, content: string): Promise<void> {
  const data = await loadData();
  data.summaries[sourceId] = { content };
  data.noteToSourceMap[noteId] = [...(data.noteToSourceMap[noteId] || []), sourceId];
  await saveData(data);
}
