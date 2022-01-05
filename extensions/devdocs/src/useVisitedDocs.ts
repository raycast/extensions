import { getLocalStorageItem, removeLocalStorageItem, setLocalStorageItem } from "@raycast/api";
import { useState, useEffect } from "react";
import { Doc } from "./types";

const VISITED_DOCS_KEY = "VISITED_DOCS";
const VISITED_DOCS_LENGTH = 25;

async function loadVisitedDocs() {
  const item = await getLocalStorageItem<string>(VISITED_DOCS_KEY);
  if (item) {
    const parsed = JSON.parse(item);
    return parsed as Doc[];
  } else {
    return [];
  }
}

async function saveVisitedDocs(docs: Doc[]) {
  const data = JSON.stringify(docs);
  await setLocalStorageItem(VISITED_DOCS_KEY, data);
}

export async function clearVisitedDocs(): Promise<void> {
  return await removeLocalStorageItem(VISITED_DOCS_KEY);
}

export function useVisitedDocs() {
  const [docs, setDocs] = useState<Doc[]>();

  useEffect(() => {
    loadVisitedDocs().then(setDocs);
  }, []);

  function visitDoc(doc: Doc) {
    const nextDocs = [doc, ...(docs?.filter((item) => item.slug !== doc.slug) ?? [])].slice(0, VISITED_DOCS_LENGTH);
    setDocs(nextDocs);
    saveVisitedDocs(nextDocs);
  }

  return { docs, visitDoc, isLoading: !docs };
}
