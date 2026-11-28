import { executeScript } from "../utils/executeScript";

export async function createTag(tagName: string) {
  return await executeScript(
    `
        const omnifocus = Application('OmniFocus');
        const doc = omnifocus.defaultDocument();

        // Search every tag, including nested ones. doc.tags only lists top-level tags,
        // so an existing child tag would otherwise be duplicated at the top level.
        const existing = doc.flattenedTags.whose({ name: args.tagName });
        if (existing.length) {
            return { id: existing[0].id() };
        }

        const tag = omnifocus.Tag({ name: args.tagName });
        doc.tags.push(tag);
        return { id: tag.id() };
    `,
    { tagName },
  );
}
