import { executeScript } from "../utils/executeScript";
import { createTag } from "./create-tags";

async function assignTagToTask(taskId: string, tagName: string) {
  return await executeScript(
    `
    const omnifocus = Application('OmniFocus');
    const doc = omnifocus.defaultDocument();
    const task = doc.tasks.byId(args.taskId);
    // flattenedTags includes nested tags; doc.tags only has the top-level ones.
    const tag = doc.flattenedTags.whose({ name: args.tagName })[0];
    omnifocus.add(tag, { to: task.tags });

    return true;
`,
    { taskId, tagName },
  );
}

export async function assignTagsToTask(taskId: string, tagNames: string[]) {
  // One tag at a time: in parallel, the same new tag could be created twice.
  for (const tagName of new Set(tagNames)) {
    await createTag(tagName);
    await assignTagToTask(taskId, tagName);
  }
}
