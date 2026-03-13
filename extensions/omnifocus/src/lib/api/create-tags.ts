import { executeScript } from "../utils/executeScript";

export async function createTag(tagName: string) {
  return await executeScript(
    `
        const omnifocus = Application('OmniFocus');
        const doc = omnifocus.defaultDocument();

        const tags = doc.tags.whose({name:  \`${tagName}\`});

        if (!tags.length) {
            const tag = omnifocus.Tag({name: \`${tagName}\`}); 
            doc.tags.push(tag);
            return { id: tag.id() };
        }

        const tag = tags[0];
        return { id: tag.id() };
    `,
  );
}
