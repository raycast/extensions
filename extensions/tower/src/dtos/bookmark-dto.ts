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

  get getPath(): string {
    if (!this.Folder) throw Error("Unable to retrieve the repository's path");

    // Remove the path's scheme
    const folderWithoutScheme = this.Folder.replace(/^file:\/\/?/, "");

    // Decode the URI-encoded repository path provided by Tower's list of bookmarks
    // Propagate a potential `URIError` as it will be caught while opening a bookmark
    return decodeURI(folderWithoutScheme);
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
