import { CreateOmniFocusTaskOptions, OmniFocusTask } from "../types/task";
import { executeScript } from "../utils/executeScript";

function getTagsScriptFragment(tags: string[]): string {
  return `
    [${tags.map((tag) => `'${tag}'`).join(",")}].map(t => {
      let tag = doc.flattenedTags.whose({name: t})
      if (!tag.length) {
       tag = omnifocus.Tag({name: t})
       doc.tags.push(tag)
      }
      return tag
    })
  `;
}
function getCreateTaskAppleScript(options: CreateOmniFocusTaskOptions): string {
  const { projectName, tags } = options;
  const taskProperties = `
    name: '${options.name}',
    ${options.deferDate ? "deferDate: new Date('" + options.deferDate.toISOString() + "')," : ""}
    ${options.dueDate ? "deferDate: new Date('" + options.dueDate + "')," : ""}
    ${options.note ? "note: '${options.note}'," : ""}
    ${options.flagged ? "flagged: true," : ""}
    `;

  if (!projectName) {
    return `
      const omnifocus = Application('OmniFocus');
      const doc = omnifocus.defaultDocument();
      
      const task = omnifocus.InboxTask({
        ${taskProperties}
      })
      doc.inboxTasks.push(task)

      if (${tags.length}) {
        omnifocus.add(${getTagsScriptFragment(tags)}, {to: task.tags})
      }

      return {
        id: task.id(),
        name: task.name()
      }
    `;
  }

  // Add to specific project
  return `
    const omnifocus = Application('OmniFocus');
    const doc = omnifocus.defaultDocument();
  
    const projects = doc.flattenedProjects()
  
    const project = projects.find(p => p.name() === '${projectName}')
    const task = omnifocus.Task({
      ${taskProperties}
    })
    project.tasks.push(task)

    if (${tags.length}) {
      omnifocus.add(${getTagsScriptFragment(tags)}, {to: task.tags})
    }

    return {
      id: task.id(),
      name: task.name()
    }
  `;
}

export async function addTask(options: CreateOmniFocusTaskOptions): Promise<OmniFocusTask> {
  const script = getCreateTaskAppleScript(options);

  const task = await executeScript<OmniFocusTask>(script);
  return task;
}
