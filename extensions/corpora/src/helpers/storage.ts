import { Corpus, CorpusInput } from "../types";
import { LocalStorage } from "@raycast/api";
import { UUID } from "crypto";

export async function getCorpora(): Promise<Corpus[] | undefined> {
  const items = await LocalStorage.allItems<{ [key: UUID]: string }>();

  const corpora: Corpus[] = Object.values(items)
    .map((item) => {
      try {
        return JSON.parse(item) as Corpus;
      } catch (error) {
        console.error("Failed to parse corpus:", error);
        return null;
      }
    })
    .filter((corpus) => corpus !== null);

  return corpora;
}

export async function getCorpus(id: UUID): Promise<Corpus | undefined> {
  const item = await LocalStorage.getItem<string>(id);
  if (!item) return undefined;

  return JSON.parse(item) as Corpus;
}

export async function corpusExists(id: UUID): Promise<boolean> {
  return (await getCorpus(id)) !== undefined;
}

export async function setCorpus(item: CorpusInput) {
  const json: Corpus = { ...item, folder: item.folder[0] };
  await LocalStorage.setItem(item.id, JSON.stringify(json));
}

export async function deleteCorpus(id: UUID) {
  await LocalStorage.removeItem(id);
}

export async function nukeCorpora() {
  await LocalStorage.clear();
}

export async function printLocalStorage() {
  const allItems = await LocalStorage.allItems();
  console.log(allItems);
}
