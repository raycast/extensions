import { LocalStorage } from "@raycast/api";

export const saveVictories = async (victories: number): Promise<void> => {
  await LocalStorage.setItem("victories", String(victories));
};

export const saveDefeats = async (defeats: number): Promise<void> => {
  await LocalStorage.setItem("defeats", String(defeats));
};

export const loadVictories = async (): Promise<number> => {
  const v = await LocalStorage.getItem("victories");
  return v ? Number(v) : 0;
};

export const loadDefeats = async (): Promise<number> => {
  const d = await LocalStorage.getItem("defeats");
  return d ? Number(d) : 0;
};
