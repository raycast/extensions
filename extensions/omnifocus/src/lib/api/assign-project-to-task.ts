import { executeScript } from "../utils/executeScript";

export async function assignProjectToTask(taskId: string, projectId: string) {
  return await executeScript<void>(
    `
        const omnifocus = Application('OmniFocus');
        const doc = omnifocus.defaultDocument();
        // Match by id: project names are not unique across folders.
        const project = doc.flattenedProjects().find((p) => p.id() === args.projectId);

        if (!project) {
            throw new Error('project_not_found');
        }

        const task = doc.tasks.byId(args.taskId);
        if (!task) {
            throw new Error('task_not_found');
        }
        task.assignedContainer = project;
        return true;
        `,
    { taskId, projectId },
  );
}
