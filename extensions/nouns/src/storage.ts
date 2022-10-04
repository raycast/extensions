import { LocalStorage } from "@raycast/api";

type Noun = {
  id: string;
  active: boolean;
};

export async function getNounsFromStorage(): Promise<string[]> {
  const nouns = await LocalStorage.getItem<string>("ls-pinned-nouns");
  return JSON.parse(nouns || "[]");
}

export async function setNounToStorage(id: string) {
  const nouns = await getNounsFromStorage();
  const updatedNouns = [...nouns, id];
  await LocalStorage.setItem("ls-pinned-nouns", JSON.stringify(updatedNouns));
  return updatedNouns;
}

export async function removeNounFromStorage(id: string) {
  const nouns = await getNounsFromStorage();
  const updatedNouns = nouns.filter((noun) => noun !== id);
  await LocalStorage.setItem("ls-pinned-nouns", JSON.stringify(updatedNouns));
  return updatedNouns;
}
