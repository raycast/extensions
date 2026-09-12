import fs from "fs";
import { DOCS_DIRECTORY } from "../constants";

export const getDocsDirectories = async () => {
  try {
    const paths = await fs.promises.readdir(__dirname + DOCS_DIRECTORY, "utf-8");

    const docPaths = paths.filter((path) => path !== "pages");

    return docPaths.map((filePath) => ({
      full: `${DOCS_DIRECTORY}/${filePath}`,
      plain: filePath,
    }));
  } catch (e) {
    throw new Error("Failed to read documentation directories");
  }
};
