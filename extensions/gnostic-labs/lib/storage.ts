import { LocalStorage } from '@raycast/api';
import { useLocalStorage } from '@raycast/utils';
import { getCurrentTask, resetInterval } from './intervals';
import { CreateTaskFormData, PomodoroTask, type PomodoroSubTask } from './types';

export const TASKS_KEY = 'pomodoro-tasks';

type TaskMap = Map<string, PomodoroTask>;

/**
 * Get all tasks from LocalStorage
 */
const getTaskStorage = async (): Promise<PomodoroTask[]> => {
  const tasks = await LocalStorage.getItem<string>(TASKS_KEY);
  return tasks ? JSON.parse(tasks) : [];
};

/**
 * Calculate the total time spent on a particular task
 */
export function getTotalTimeSpent(task: PomodoroTask): { hours: number; minutes: number; seconds: number } {
  // totalTimeSpent is in seconds -> convert to a formatted string in `00:00` format
  const hours = Math.floor(task.totalTimeSpent / 3600);
  const minutes = Math.floor((task.totalTimeSpent % 3600) / 60);
  const seconds = task.totalTimeSpent % 60;
  return { hours, minutes, seconds };
}

/**
 * Get all tasks from LocalStorage, converted to a Map
 *
 * **NOTE** must use inside of a component
 */
export const useTaskStorage = () => {
  const taskStorage = useLocalStorage<PomodoroTask[]>(TASKS_KEY, []);
  const taskMap: TaskMap = taskStorage.value ? createTaskMap(taskStorage.value) : new Map();

  return { taskMap, isLoading: taskStorage.isLoading, taskStorage };
};

/**
 * Serializes tasks and subtasks into a Map for efficient lookups and deduplication
 */
const createTaskMap = (tasks: PomodoroTask[]) => {
  const taskMap = new Map<string, PomodoroTask>(tasks.map((t) => [t.id, t]));
  const subtaskMap = new Map<string, PomodoroSubTask>(tasks.flatMap((t) => t.subTasks?.map((st) => [st.id, st])));
  for (const task of taskMap.values()) {
    task.subTasks = task.subTasks?.map((st) => subtaskMap.get(st.id)!);
  }
  return taskMap;
};

/**
 * Get all tasks from LocalStorage, converted to a Map
 */
export async function getTaskMap(): Promise<Map<string, PomodoroTask>> {
  const tasks = await getTaskStorage();
  if (!tasks) {
    console.log('no active tasks');
    await LocalStorage.setItem(TASKS_KEY, JSON.stringify([]));
    return new Map();
  }

  return createTaskMap(tasks);
}

/**
 * Parse a string of subtasks into an array of PomodoroSubTask objects.
 */
export function parseSubtasks(parentId: string, subtaskString: string): PomodoroSubTask[] {
  const subtasks: PomodoroSubTask[] = [];
  for (const [index, subtask] of subtaskString.split('\n').entries()) {
    const title = subtask.trim();
    if (title === '') continue;
    subtasks.push({
      id: `${parentId}-${index}`,
      title,
      completed: false,
    });
  }
  return subtasks;
}

/**
 * Update a task in LocalStorage.
 */
export async function updateTask(task: PomodoroTask): Promise<PomodoroTask> {
  const taskMap = await getTaskMap();
  taskMap.set(task.id, task);
  await LocalStorage.setItem(TASKS_KEY, JSON.stringify(Array.from(taskMap.values())));

  return task;
}

/**
 * Create a new task from the form input and store it in LocalStorage.
 */
export async function createNewTask(input: CreateTaskFormData): Promise<PomodoroTask> {
  const tasks = await getTaskStorage();
  const taskMap = createTaskMap(tasks);
  const now = new Date();
  const taskId = now.getTime().toString();
  const subTasks = parseSubtasks(taskId, input.subTasks);
  const newTask: PomodoroTask = {
    id: taskId,
    title: input.title,
    subTasks,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    totalTimeSpent: 0,
  };

  console.log('created task', newTask.title);

  // Update or add the task
  taskMap.set(newTask.id, newTask);
  await LocalStorage.setItem(TASKS_KEY, JSON.stringify(Array.from(taskMap.values())));
  return newTask;
}

/**
 * Complete a task and update it in LocalStorage.
 */
export async function completeTask(taskId: string): Promise<void> {
  const tasks = await getTaskStorage();
  const taskMap = createTaskMap(tasks);
  const task = taskMap.get(taskId);
  if (!task) return;
  task.completedAt = new Date().toISOString();
  await LocalStorage.setItem(TASKS_KEY, JSON.stringify(Array.from(taskMap.values())));
}
/**
 * Delete a specific task from LocalStorage, and reset the interval if the task is the current task.
 */
export async function deleteTask(taskId: string): Promise<void> {
  const taskMap = await getTaskMap();
  taskMap.delete(taskId);
  await LocalStorage.setItem(TASKS_KEY, JSON.stringify(Array.from(taskMap.values())));
  const currentTask = getCurrentTask();
  // reset the interval if the task is the current task
  if (currentTask?.id === taskId) {
    resetInterval();
  }
}

export async function deleteAllTasks(): Promise<void> {
  await LocalStorage.setItem(TASKS_KEY, JSON.stringify([]));
}
