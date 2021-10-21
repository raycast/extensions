import tildify from "tildify";

export default class Bookmark {
  Folder: string;
  Name: string;
  LastOpenedDate: number;
  RepositoryIdentifier: string;

  constructor(Folder = "", Name = "", LastOpenedDate = 0, RepositoryIdentifier = "") {
    this.Name = Name;
    this.LastOpenedDate = LastOpenedDate;
    this.RepositoryIdentifier = RepositoryIdentifier;
    this.Folder = Folder;
  }

  get getFolder() {
    return this.Folder ? tildify(this.Folder.replace("file:/", "")) : "";
  }
  get getPath() {
    return this.Folder ? this.Folder.replace("file://", "") : "";
  }

  get isComplete() {
    return this.RepositoryIdentifier !== "";
  }
}
