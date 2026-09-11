import process from "node:process";
import { ExtensionMetadata } from "../types";

export const isWindows = process.platform === "win32";

export function formatItem(item: ExtensionMetadata, format?: string) {
  const formatPattern = format || "{title} ({link})";

  return formatPattern
    .replaceAll("{title}", item.title)
    .replaceAll("{link}", item.link)
    .replaceAll("{author}", item.author);
}

export function formatOutput(
  installedExtensions: ExtensionMetadata[],
  format?: string,
  separator?: string,
  prepend?: string,
) {
  const joinChar = separator === "newline" ? "\n" : ", ";
  const prependText = prepend ? `${prepend}\n` : "";

  return (
    prependText.replaceAll("{count}", installedExtensions.length.toString()) +
    installedExtensions.map((item) => formatItem(item, format)).join(joinChar)
  );
}

export async function mapInBatches<T, R>(items: T[], batchSize: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    out.push(...(await Promise.all(batch.map(fn))));
  }
  return out;
}
