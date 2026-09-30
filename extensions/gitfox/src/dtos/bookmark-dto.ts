import tildify from "tildify";
import { getCurrentBranchName } from "../utils";

export default class Bookmark {
  folder: string;
  name: string;
  id: string;
  type: number;
  children: Bookmark[];

  constructor(folder = "", name = "", id = "", type = 1, children: Bookmark[] = []) {
    this.name = name;
    this.id = id;
    this.folder = folder;
    this.type = type;
    this.children = children;
  }

  get getFolder() {
    return this.folder
      ? tildify(this.folder.replace("file:/", "").replaceAll("&", "\\&").replaceAll("%20", "\\ "))
      : "";
  }

  get getPath() {
    return this.folder ? this.folder.replace("file://", "").replaceAll("&", "&").replaceAll("%20", " ") : "";
  }

  get getBranch(): { name: string; unknowBranch: boolean } {
    try {
      const branch = getCurrentBranchName(this.getPath);
      return {
        name: branch.length > 32 ? `${branch.slice(0, 32)}...` : branch,
        unknowBranch: false,
      };
    } catch {
      return { name: "Unknow branch", unknowBranch: true };
    }
  }
}
