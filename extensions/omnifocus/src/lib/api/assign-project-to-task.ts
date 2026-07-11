import { executeScript } from "../utils/executeScript";

export async function assignProjectToTask(taskId: string, projectName: string) {
  return await executeScript<void>(`
        const omnifocus = Application('OmniFocus');
        const doc = omnifocus.defaultDocument();
        const projects = doc.flattenedProjects();
        const project = projects.find(p => p.name() === \`${projectName}\`);

        if (!project) {
            throw new Error('project_not_found');
        }
        
        const task = doc.tasks.byId('${taskId}');
        if (!task) {
            throw new Error('task_not_found');
        }
        task.assignedContainer = project;
        return true;
        `);
}
