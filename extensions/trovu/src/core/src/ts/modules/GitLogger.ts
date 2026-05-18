export default class GitLogger {
  [key: string]: any;

  constructor(gitInfo: AnyObject) {
    this.gitInfo = gitInfo;
  }
  logVersion() {
    console.log("Trovu running version", this.getVersion());
  }

  getVersion() {
    return `${this.gitInfo.commit.hash} ${this.gitInfo.commit.date}`;
  }
}
