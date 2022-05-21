import { homedir } from "os";
import { readdirSync } from "fs";
import path from "path";

const indexPath =
  "~/Library/Containers/com.lukilabs.lukiapp/Data/Library/Application Support/com.lukilabs.lukiapp/Search";

type SpaceSQLite = {
  path: string;
  spaceID: string;
  primary: boolean;
};

export default class Config {
  spaces: SpaceSQLite[];

  constructor() {
    const pwd = indexPath.replace("~", homedir());

    try {
      this.spaces = readdirSync(pwd)
        .filter((str) => str.match(/sqlite$/))
        .map((str) => this.makeSpaceFromStr(pwd, str));
    } catch (e) {
      console.debug(`failed getting files: ${e}`);
      this.spaces = [];
    }

    console.debug("constructed config object");
  }

  primarySpace = () => this.spaces.find((space) => space.primary);

  private makeSpaceFromStr = (pwd: string, str: string): SpaceSQLite => ({
    primary: !str.includes("||"),
    path: path.join(pwd, str),
    spaceID: str.match(/\w{8}-\w{4}-\w{4}-\w{4}-\w{12}/g)?.pop() || "",
  });
}
