import { LocalStorage } from "@raycast/api";

export type Noun = {
  id: string;
  active: boolean;
};

export async function getNounsFromStorage(): Promise<Noun[]> {
  const nouns = await LocalStorage.getItem<string>("ls-pinned-nouns");
  return JSON.parse(nouns || "[]");
}

export async function setNounToStorage(id: string) {
  const nouns = await getNounsFromStorage();
  const updatedNouns: Noun[] = [...nouns, { id: id, active: false }];
  await LocalStorage.setItem("ls-pinned-nouns", JSON.stringify(updatedNouns));
  return updatedNouns;
}

export async function removeNounFromStorage(id: string) {
  const nouns = await getNounsFromStorage();
  const updatedNouns = nouns.filter((noun) => noun.id !== id);
  await LocalStorage.setItem("ls-pinned-nouns", JSON.stringify(updatedNouns));
  return updatedNouns;
}

export async function togglePinnedNoun(id: string) {
  const nouns = await getNounsFromStorage();
  const updatedNouns = nouns.map((noun) => ({ ...noun, active: noun.id === id }));
  await LocalStorage.setItem("ls-pinned-nouns", JSON.stringify(updatedNouns));
  return updatedNouns;
}
