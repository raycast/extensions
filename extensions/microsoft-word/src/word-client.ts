import {
  activeDocumentScript,
  createDocumentScript,
  documentTextScript,
  toggleTrackChangesScript,
} from "./word-scripts";

export interface WordDocument {
  name: string;
  identity: string;
  path: string;
  saved: boolean;
  tracking: boolean;
  readOnly: boolean;
}

type ScriptRunner = (script: string, args: string[], options: { timeout: number }) => Promise<string>;

function response(raw: string, length: number): unknown[] {
  let values: unknown;
  try {
    values = JSON.parse(raw);
  } catch {
    throw new Error("Microsoft Word returned an unexpected response. Refresh and try again.");
  }
  if (!Array.isArray(values) || values.length !== length) {
    throw new Error("Microsoft Word returned an unexpected response. Refresh and try again.");
  }
  return values;
}

// Keep the native runner at one boundary so failure tests never open Word.
export function createWordClient(run: ScriptRunner) {
  const execute = (script: string, args: string[] = []) => run(script, args, { timeout: 30000 });
  return {
    async readActiveDocument(): Promise<WordDocument> {
      const values = response(await execute(activeDocumentScript), 6);
      if (
        !values.slice(0, 3).every((v) => typeof v === "string") ||
        !values.slice(3).every((v) => typeof v === "boolean") ||
        !values[0] ||
        !values[1]
      ) {
        throw new Error("Microsoft Word returned an unexpected document response.");
      }
      const [name, identity, path, saved, tracking, readOnly] = values as [
        string,
        string,
        string,
        boolean,
        boolean,
        boolean,
      ];
      return { name, identity, path, saved, tracking, readOnly };
    },
    async readText(identity: string, selection = false): Promise<string> {
      const [text] = response(await execute(documentTextScript, [identity, selection ? "selection" : "document"]), 1);
      if (typeof text !== "string") throw new Error("Microsoft Word returned unexpected text. Refresh and try again.");
      return text.replace(/\r/g, "\n");
    },
    async toggleTrackChanges(identity?: string): Promise<boolean> {
      const [tracking] = response(await execute(toggleTrackChangesScript, identity ? [identity] : []), 1);
      if (typeof tracking !== "boolean") throw new Error("Could not verify Track Changes.");
      return tracking;
    },
    async createDocument(text: string): Promise<string> {
      const [name] = response(await execute(createDocumentScript, [text.replace(/\r?\n/g, "\r")]), 1);
      if (typeof name !== "string" || !name.trim()) throw new Error("Could not verify the new Word document.");
      return name;
    },
    async setTrackChanges(identity: string, enabled: boolean): Promise<boolean> {
      const [tracking] = response(await execute(toggleTrackChangesScript, [identity, enabled ? "on" : "off"]), 1);
      if (tracking !== enabled) throw new Error("Microsoft Word did not apply the requested Track Changes state.");
      return tracking;
    },
  };
}
