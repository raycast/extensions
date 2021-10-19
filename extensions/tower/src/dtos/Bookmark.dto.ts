export default class Bookmark {
  Folder: string;
  Name: string;
  LastOpenedDate: number;
  RepositoryIdentifier: string;

  constructor(Folder = "", Name = "", LastOpenedDate = 0, RepositoryIdentifier = "") {
    this.Folder = Folder;
    this.Name = Name;
    this.LastOpenedDate = LastOpenedDate;
    this.RepositoryIdentifier = RepositoryIdentifier;
  }
}
