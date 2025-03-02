import { describe, bench } from "vitest";
import { readFile } from "simple-plist";
import { promisify } from "util";

import { PLIST_PATH } from "../constants";
import { execSync } from "child_process";
import path from "path";

const readPlist = promisify(readFile);

describe("test bookmark parser benchmark", async () => {
  bench("parse in simple plist", async () => {
    await readPlist(PLIST_PATH);
  });

  bench("parse in go parser", async () => {
    const GO_PARSER_PATH = path.join(__dirname, "../tools", "bookmarks-parser");
    execSync(`${GO_PARSER_PATH} -input ${PLIST_PATH}`);
  });
});
