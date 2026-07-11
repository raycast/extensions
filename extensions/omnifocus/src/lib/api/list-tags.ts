import { executeScript } from "../utils/executeScript";

export async function listTags(): Promise<string[]> {
  const script = `
        const application = Application('Omnifocus');
        const doc = application.defaultDocument();
        const tags = doc.flattenedTags();
        return tags.map(tag => tag.name());
    `;

  return await executeScript<string[]>(script);
}
