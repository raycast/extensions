import { environment, open } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { exec } from "child_process";
import { homedir } from "os";
import path from "path";
import { promisify } from "util";

type TextReplacement = {
  ZPHRASE: string;
  ZSHORTCUT: string;
  ZTIMESTAMP: number;
  ZWASDELETED: "0" | "1";
  ZUNIQUENAME: string;
};

const execAsync = promisify(exec);

// The JSON dump of a large replacement set exceeds Node's default 1 MiB stdout buffer
const MAX_BUFFER = 64 * 1024 * 1024;

async function getTextReplacements() {
  const dbPath = path.resolve(homedir(), "Library/KeyboardServices/TextReplacements.db");
  const query = "SELECT * FROM ZTEXTREPLACEMENTENTRY";

  try {
    const { stdout } = await execAsync(`sqlite3 --json --readonly "${dbPath}" "${query}"`, {
      maxBuffer: MAX_BUFFER,
    });
    return JSON.parse(stdout) as TextReplacement[];
  } catch (error) {
    showFailureToast(error, { title: "Could not get text replacements" });
  }
}

export default async function Command() {
  const data = await getTextReplacements();

  if (data) {
    const replacements = data?.filter((row) => row.ZWASDELETED !== "1");

    const raycastFlavor = environment.raycastVersion.includes("alpha") ? "raycastinternal" : "raycast";

    const snippets = replacements?.map((replacement) => ({
      name: replacement.ZPHRASE,
      text: replacement.ZPHRASE,
      keyword: replacement.ZSHORTCUT,
    }));
    const params = snippets?.map((snippet) => `snippet=${encodeURIComponent(JSON.stringify(snippet))}`).join("&");
    const importURL = `${raycastFlavor}://snippets/import?${params}`;
    open(importURL);
  }
}
