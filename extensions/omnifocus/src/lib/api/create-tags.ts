import { executeScript } from "../utils/executeScript";

export async function createTag(tagName: string) {
  return await executeScript(
    `
        const omnifocus = Application('OmniFocus');
        const doc = omnifocus.defaultDocument();

        const tags = doc.tags.whose({name: '${tagName}'});

        const tag = tags[0];
        if (!tag) {
            doc.tags.push(omnifocus.Tag({name: '${tagName}'}));
        }

        return {id: tag.id()}
    `,
  );
}
