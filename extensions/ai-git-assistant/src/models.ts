export class Branch {
  name: string;
  lastCommitDate: string;
  lastCommitAuthor: string;

  constructor(name: string, lastCommitDate: string, lastCommitAuthor: string) {
    this.name = name;
    this.lastCommitDate = lastCommitDate;
    this.lastCommitAuthor = lastCommitAuthor;
  }
}
