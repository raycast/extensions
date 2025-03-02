import { runAppleScript } from "run-applescript";
import fs from "fs";
import path from "path";

const maximizeAllWindows = fs.readFileSync(path.join(__dirname, "assets", "maximize-windows.applescript"), "utf8");

const main = async () => {
  const result = await runAppleScript(maximizeAllWindows);
  console.log(result);
};

main();
