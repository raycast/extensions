import { LocalStorage } from "@raycast/api";
import { v4 as uuidv4 } from "uuid";

export interface Author {
  firstName: string;
  lastName: string;
  middleName?: string;
}

export interface Citation {
  id: string;
  title: string;
  authors: Author[];
  publisher?: string;
  publicationDate?: string;
  url?: string;
  accessDate: string;
  citationStyle: "apa" | "mla" | "chicago" | "harvard";
  formattedCitation: string;
  createdAt: string;
  type: "website" | "book" | "journal" | "newspaper" | "other";
  // Additional fields for specific types
  journalName?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
}

const CITATIONS_STORAGE_KEY = "citations";

export async function saveCitation(citation: Omit<Citation, "id" | "createdAt">): Promise<Citation> {
  const citations = await getCitations();

  const newCitation: Citation = {
    ...citation,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
  };

  citations.unshift(newCitation);
  await LocalStorage.setItem(CITATIONS_STORAGE_KEY, JSON.stringify(citations));

  return newCitation;
}

export async function getCitations(): Promise<Citation[]> {
  const citationsJSON = await LocalStorage.getItem<string>(CITATIONS_STORAGE_KEY);
  return citationsJSON ? JSON.parse(citationsJSON) : [];
}

export async function getCitation(id: string): Promise<Citation | undefined> {
  const citations = await getCitations();
  return citations.find((citation) => citation.id === id);
}

export async function updateCitation(updatedCitation: Citation): Promise<void> {
  const citations = await getCitations();
  const index = citations.findIndex((citation) => citation.id === updatedCitation.id);

  if (index !== -1) {
    citations[index] = updatedCitation;
    await LocalStorage.setItem(CITATIONS_STORAGE_KEY, JSON.stringify(citations));
  }
}

export async function deleteCitation(id: string): Promise<void> {
  let citations = await getCitations();
  citations = citations.filter((citation) => citation.id !== id);
  await LocalStorage.setItem(CITATIONS_STORAGE_KEY, JSON.stringify(citations));
}
