import { runAppleScript } from "@raycast/utils";

export interface Task {
  id: string;
  name: string;
  parentTask?: Task;
  category?: {
    id: string;
    name: string;
  };
  project: {
    id: string;
    name: string;
  };
}

export async function getTasks(): Promise<Task[]> {
  const res = await runAppleScript(
    `
    const tyme = Application("Tyme")

    // Categories
    const tymeCategories = tyme.categories
    
    const categoryIds = tymeCategories.id()
    const categoryNames = tymeCategories.name()
    
    const categories = categoryIds.map((id, index) => {
      return {
        id: id,
        name: categoryNames[index],
      }
    })
    
    // Projects
    const tymeProjects = tyme.projects.whose({ completed: false })
    
    const projectIds = tymeProjects.id()
    const projectNames = tymeProjects.name()
    
    const projects = projectIds.map((id, index) => {
      return {
        id: id,
        name: projectNames[index],
      }
    })
    
    // Tasks
    const tymeTasks = tymeProjects.tasks.whose({ completed: false })
    
    const taskIds = tymeTasks.id().flat().flat()
    const taskNames = tymeTasks.name().flat().flat()
    const taskProjectIds = tymeTasks.relatedprojectid().flat().flat()
    const taskCategoryIds = tymeTasks.relatedcategoryid().flat().flat()
    
    
    const tasks = taskIds.map((id, index) => {
      return {
        id: id,
        name: taskNames[index],
        project: projects.find(project => project.id === taskProjectIds[index]),
        category: categories.find(category => category.id === taskCategoryIds[index]),
      }
    })
    
    
    // Sub tasks
    const tymeSubTasks = tymeTasks.subtasks.whose({ completed: false })
    
    const subTaskIds = tymeSubTasks.id().flat().flat()
    const subTaskNames = tymeSubTasks.name().flat().flat()
    const subTaskParentIds = tymeSubTasks.relatedtaskid().flat().flat()
    const subTaskProjectIds = tymeSubTasks.relatedprojectid().flat().flat()
    const subTaskCategoryIds = tymeSubTasks.relatedcategoryid().flat().flat()
    
    const subTasks = subTaskIds.map((id, index) => {
      return {
        id: id,
        name: subTaskNames[index],
        parentTask: tasks.find(task => task.id === subTaskParentIds[index]),
        project: projects.find(project => project.id === subTaskProjectIds[index]),
        category: categories.find(category => category.id === subTaskCategoryIds[index]),
      }
    })
    
    
    
    // All tasks
    const allTasks = tasks.concat(subTasks);
    
    // "Return"
    JSON.stringify(allTasks)
`,
    {
      language: "JavaScript",
    }
  );

  return JSON.parse(res) as Task[];
}

export async function startTrackingTask(taskId: string): Promise<boolean> {
  const res = await runAppleScript(
    `
    const tyme = Application("Tyme");

    tyme.starttrackerfortaskid("${taskId}");
  `,
    [taskId],
    {
      language: "JavaScript",
    }
  );

  return JSON.parse(res);
}

export async function stopTracking(): Promise<boolean> {
  const res = await runAppleScript(
    `
    const tyme = Application("Tyme")

    // Tasks
    const tymeTasks = tyme.projects.tasks
    const taskIds = tymeTasks.id().flat().flat()
    
    // Sub tasks
    const tymeSubTasks = tymeTasks.subtasks
    const subTaskIds = tymeSubTasks.id().flat().flat()
    
    // All task ids
    const allTaskIds = taskIds.concat(subTaskIds)
    
    
    // Stop all
    const stopAll = allTaskIds.map((id) => {
      return tyme.stoptrackerfortaskid(id)
    })
    
    const allSuccessful = stopAll.every(res => res === true)
    
    JSON.stringify(allSuccessful, null, 2)
  `,
    {
      language: "JavaScript",
    }
  );

  return JSON.parse(res);
}
