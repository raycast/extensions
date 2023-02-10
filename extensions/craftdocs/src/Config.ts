import { homedir } from "os";
import { readdirSync } from "fs";
import path from "path";

const craftDataRoot = "~/Library/Containers/com.lukilabs.lukiapp/Data/Library/Application Support/com.lukilabs.lukiapp";
const searchPath = `${craftDataRoot}/Search`;

type SpaceSQLite = {
  path: string;
  spaceID: string;
  primary: boolean;
};

export default class Config {
  spaces: SpaceSQLite[];

  constructor() {
    try {
      const pathToIndexDatabases = searchPath.replace("~", homedir());
      const databasesForExistingRealms = this.buildFilterRegexForExistingRealms();

      this.spaces = readdirSync(pathToIndexDatabases)
        .filter((str) => str.match(databasesForExistingRealms))
        .map((str) => this.makeSpaceFromStr(pathToIndexDatabases, str));
    } catch (e) {
      console.debug(`failed getting files: ${e}`);
      this.spaces = [];
    }

    console.debug("constructed config object");
  }

  primarySpace = () => this.spaces.find((space) => space.primary);

  private buildFilterRegexForExistingRealms = (): RegExp => {
    const root = craftDataRoot.replace("~", homedir());

    const regexIDsPart = readdirSync(root)
      .filter(this.selectRealmFiles)
      .map(this.extractSpaceIDs)
      .filter((str) => str)
      .join("|");

    return new RegExp(`(?:${regexIDsPart})[^.]*.sqlite$`);
  };

  private selectRealmFiles = (str: string): boolean => str.match(/\.realm$/) !== null;

  // Main Realm file is named in this way:
  // LukiMain_e95db95e-286c-e7c9-276e-c61b378d1e1c_2E3178A2-26CD-4991-BBCB-67F097040B59.realm
  //          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  //          ID of the main space
  //
  // Additional spaces are named like this:
  // LukiMain_e95db95e-286c-e7c9-276e-c61b378d1e1c||b3fccbd6-1e8e-a73f-16d5-9d14a9f17793_2E3178A2-26CD-4991-BBCB-67F097040B59.realm
  //                                                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  //                                                ID of secondary spaces
  //
  // With the provided string, this function selects ID or returns undefined.
  private extractSpaceIDs = (str: string): string | undefined => {
    const split = str.split("_");
    if (split.length !== 3) {
      return;
    }

    return split[1].split("||").pop();
  };

  private makeSpaceFromStr = (pwd: string, str: string): SpaceSQLite => ({
    primary: !str.includes("||"),
    path: path.join(pwd, str),
    spaceID: str.match(/\w{8}-\w{4}-\w{4}-\w{4}-\w{12}/g)?.pop() || "",
  });
}
