import { readFile } from "fs/promises";

export default async function getFilestoreMappings(presetUrl: string) {
  try {
    const data = await readFile(presetUrl, { encoding: "utf8" });
    const parsedData = JSON.parse(data).filestore_setups[0].mappings;

    const filestoreMappings = Object.keys(parsedData).reduce((prev: Record<string, string>, curr: string) => {
      prev[curr] = parsedData[curr].path;
      return prev;
    }, {});

    return filestoreMappings;
  } catch (err) {
    return {};
  }
}
