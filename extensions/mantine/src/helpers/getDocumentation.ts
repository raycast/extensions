import { Markdown } from "../utils/parseMD";
import { getDocCategoryFiles } from "./getDocCategoryFiles";
import { getDocsDirectories } from "./getDocsDirectories";
import { getFileMarkdown } from "./getFileMarkdown";

export type DocumentationSection = {
  data: Markdown[];
  section: string;
};

export const getDocumentation = async (): Promise<DocumentationSection[]> => {
  const directories = await getDocsDirectories();

  const documentation = await Promise.all(
    directories.map(async (directory) => {
      const files = await getDocCategoryFiles(directory.full);

      const markdownData = await files.reduce<Promise<Markdown[]>>(async (acc, file) => {
        try {
          const markdown = await getFileMarkdown(`./${directory.full}/${file}`);

          return [...(await acc), markdown];
        } catch (error) {
          console.error(error);

          return await acc;
        }
      }, Promise.resolve([]));

      return {
        data: markdownData,
        section: directory.plain,
      };
    })
  );

  return documentation;
};
