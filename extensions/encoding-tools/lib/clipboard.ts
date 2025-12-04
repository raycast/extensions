import { Clipboard } from "@raycast/api";
import { runAppleScript } from "run-applescript";

/**
 * An enum of possible types that the clipboard can contain.
 */
export enum DataType {
  Text = "«class utf8»",
  File = "«class furl»",
}

/**
 * Data (corresponding to one specific {@link DataType}) inside the clipboard.
 */
export class Data {
  public readonly type: DataType;
  public readonly contents: any;

  public constructor(data: { type: DataType; contents: any }) {
    this.type = data.type;
    this.contents = data.contents;
  }
}

/**
 * Reads the contents of the clipboard.
 */
export async function read(type: DataType): Promise<any> {
  const typeName = (DataType as any)[type] as string; // Yes `npm run build`, this works.
  if (!(await AppleScript.getClipboardClasses()).includes(type)) {
    throw new Error(`Clipboard does not contain type '${typeName}'`);
  }

  switch (type) {
    case DataType.Text:
      return await Clipboard.readText();

    case DataType.File:
      return await AppleScript.getClipboardContentsAsFilePath();
  }

  throw new Error(`Unsupported type '${typeName}' for clipboard read.`);
}

/**
 * Returns a set of types contained inside the clipboard.
 */
export async function types(): Promise<Set<DataType>> {
  return new Set<DataType>(await AppleScript.getClipboardClasses());
}

namespace AppleScript {
  /**
   * Gets the list of {@link DataType}s inside the current clipboard.
   */
  export async function getClipboardClasses(): Promise<DataType[]> {
    const classes = await runAppleScript(`copy ((clipboard info) as string) to stdout`);
    const found: DataType[] = [];

    for (const typeName in DataType) {
      const type = (DataType as any)[typeName] as DataType; // Yes `npm run build`, this works.

      if (classes.includes(type)) {
        found.push(type);
      }
    }

    return found;
  }

  /**
   * Gets the first (and only first) file copied into the clipboard.
   */
  export async function getClipboardContentsAsFilePath(): Promise<string | null> {
    const url = await runAppleScript(`copy (POSIX path of (the clipboard as «class furl»)) to stdout`);
    return url === "" ? null : url;
  }
}
