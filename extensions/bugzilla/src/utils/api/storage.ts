import { LocalStorage } from "@raycast/api";
import { BugzillaInstance } from "../../interfaces/bugzilla";
import { v4 as uuidv4 } from "uuid";

const BugzillaKey = "bugzilla";

export const saveBugzilla = async (bugzillaList: BugzillaInstance[]) => {
  await LocalStorage.setItem(BugzillaKey, JSON.stringify(bugzillaList));
};

export const listBugzilla = async (): Promise<BugzillaInstance[]> => {
  const bugzillaList = await LocalStorage.getItem(BugzillaKey);
  return JSON.parse(bugzillaList ? bugzillaList.toString() : "[]") as BugzillaInstance[];
};

export const deleteBugzilla = async (id: string) => {
  const bugzillaList = await listBugzilla();
  await saveBugzilla(bugzillaList.filter((g) => g.id !== id));
};

export const addBugzilla = async (bugzilla: BugzillaInstance) => {
  let bugzillaList = await listBugzilla();
  if (bugzilla.id) {
    bugzillaList = bugzillaList.map((g) => {
      if (g.id === bugzilla.id) {
        bugzilla.updateTime = new Date().getTime();
        return bugzilla;
      }
      return g;
    });
  } else {
    bugzilla.id = uuidv4();
    bugzilla.createTime = new Date().getTime();
    bugzilla.updateTime = new Date().getTime();
    bugzillaList.push(bugzilla);
  }
  await saveBugzilla(bugzillaList);
};
