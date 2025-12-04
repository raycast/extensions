import { executeScript } from "../utils/executeScript";
import { createTag } from "./create-tags";

async function assignTagToTask(taskId: string, tagName: string) {
  return await executeScript(`
    const omnifocus = Application('OmniFocus');
    const doc = omnifocus.defaultDocument();
    const task = doc.tasks.byId('${taskId}');
    const tags = doc.tags.whose({name: \`${tagName}\`});
    const tag = tags[0];
    omnifocus.add(tag, {to: task.tags})

    return true
`);
}

export async function assignTagsToTask(taskId: string, tagNames: string[]) {
  await Promise.all(tagNames.map((tagName) => createTag(tagName).then(() => assignTagToTask(taskId, tagName))));
}
