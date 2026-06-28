import { parseMD } from "../utils/parseMD";
import { readFile } from "../utils/readFile";

export const getFileMarkdown = async (path: string) => {
  const data = await readFile(path);

  return parseMD(data as string);
};
