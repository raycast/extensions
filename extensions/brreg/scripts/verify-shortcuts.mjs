import { readFileSync } from "node:fs";
import { join } from "node:path";

function assertMatch(source, regex, message) {
  if (!regex.test(source)) {
    throw new Error(message);
  }
}

const root = process.cwd();
const constantsPath = join(root, "src/constants/index.ts");
const readmePath = join(root, "README.md");

const constants = readFileSync(constantsPath, "utf8");
const readme = readFileSync(readmePath, "utf8");

assertMatch(
  constants,
  /COPY_ORG_NUMBER:\s*\{\s*modifiers:\s*\["cmd",\s*"shift"\],\s*key:\s*"c"\s*\}/m,
  "COPY_ORG_NUMBER must remain cmd+shift+c.",
);

assertMatch(
  constants,
  /COPY_ADDRESS:\s*\{\s*modifiers:\s*\["cmd",\s*"shift"\],\s*key:\s*"b"\s*\}/m,
  "COPY_ADDRESS must remain cmd+shift+b.",
);

assertMatch(readme, /`⌘⇧C`\s+—\s+Copy organisation number/, "README shortcut for org number is out of sync.");
assertMatch(readme, /`⌘⇧B`\s+—\s+Copy business address/, "README shortcut for business address is out of sync.");

console.log("Shortcut consistency checks passed.");
