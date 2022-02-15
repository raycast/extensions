import tildify from "tildify";
import { getCurrentBranchName } from "../utils";

export default class Bookmark {
  Folder: string;
  Name: string;
  RepositoryIdentifier: string;
  Type: number;
  Children: Bookmark[];

  constructor(Folder = "", Name = "", RepositoryIdentifier = "", Type = 1, Children: Bookmark[] = []) {
    this.Name = Name;
    this.RepositoryIdentifier = RepositoryIdentifier;
    this.Folder = Folder;
    this.Type = Type;
    this.Children = Children;
  }

  get getFolder() {
    return this.Folder
      ? tildify(this.Folder.replace("file:/", "").replaceAll("&", "\\&").replaceAll("%20", "\\ "))
      : "";
  }

  get getPath() {
    return this.Folder ? this.Folder.replace("file://", "").replaceAll("&", "&").replaceAll("%20", " ") : "";
  }

  get isComplete() {
    return this.RepositoryIdentifier !== "";
  }

  get getBranch() {
    const branch = getCurrentBranchName(this.getPath);

    return branch.length > 50 ? `${branch.slice(0, 50)}...` : branch;
  }
}
