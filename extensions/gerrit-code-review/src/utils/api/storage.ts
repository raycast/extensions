import { LocalStorage } from "@raycast/api";
import { GerritInstance } from "../../interfaces/gerrit";
import { v4 as uuidv4 } from "uuid";

const GerritKey = "gerrit";

export const saveGerrit = async (gerritList: GerritInstance[]) => {
  await LocalStorage.setItem(GerritKey, JSON.stringify(gerritList));
};

export const listGerrit = async (): Promise<GerritInstance[]> => {
  const gerritList = await LocalStorage.getItem(GerritKey);
  return JSON.parse(gerritList ? gerritList.toString() : "[]") as GerritInstance[];
};

export const deleteGerrit = async (id: string) => {
  const gerritList = await listGerrit();
  await saveGerrit(gerritList.filter((g) => g.id !== id));
};

export const addGerrit = async (gerrit: GerritInstance) => {
  let gerritList = await listGerrit();
  if (gerrit.id) {
    gerritList = gerritList.map((g) => {
      if (g.id === gerrit.id) {
        gerrit.updateTime = new Date().getTime();
        return gerrit;
      }
      return g;
    });
  } else {
    gerrit.id = uuidv4();
    gerrit.createTime = new Date().getTime();
    gerrit.updateTime = new Date().getTime();
    gerritList.push(gerrit);
  }
  await saveGerrit(gerritList);
};
