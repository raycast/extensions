import tildify from "tildify";
import { getCurrentBranchName } from "../utils";

export default class Bookmark {
  Folder: string;
  Name: string;
  LastOpenedDate: number;
  RepositoryIdentifier: string;
  Type: number;
  Children: Bookmark[];

  constructor(
    Folder = "",
    Name = "",
    LastOpenedDate = 0,
    RepositoryIdentifier = "",
    Type = 1,
    Children: Bookmark[] = []
  ) {
    this.Name = Name;
    this.LastOpenedDate = LastOpenedDate;
    this.RepositoryIdentifier = RepositoryIdentifier;
    this.Folder = Folder;
    this.Type = Type;
    this.Children = Children;
  }

  get getFolder(): string {
    return this.Folder
      ? tildify(this.Folder.replace("file:/", "").replaceAll("&", "\\&").replaceAll("%20", "\\ "))
      : "";
  }

  get getPath(): string {
    return this.Folder ? this.Folder.replace("file://", "").replaceAll("&", "&").replaceAll("%20", " ") : "";
  }

  get isComplete(): boolean {
    return this.RepositoryIdentifier !== "";
  }

  get getBranch(): { name: string; unknowBranch: boolean } {
    try {
      const branch = getCurrentBranchName(this.getPath);
      return {
        name: branch.length > 50 ? `${branch.slice(0, 50)}...` : branch,
        unknowBranch: false,
      };
    } catch {
      return { name: "Unknow branch", unknowBranch: true };
    }
  }
}
