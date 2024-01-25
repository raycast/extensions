import { showHUD } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

import { environment } from "@raycast/api";
import fs from 'node:fs'

export default async function () {
  const script = environment.assetsPath + "/as.js"
  const source = fs.readFileSync(script)
  try {
  const res = await runAppleScript(
    source.toString(), [],
    {
      language: "JavaScript"
    }
  );
  } catch {
    await showHUD("Failed :(");
    return
  }
  await showHUD("Done!");
}