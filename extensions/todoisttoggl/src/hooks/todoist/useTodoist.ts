import { UpdateTaskArgs, TodoistApi, AddTaskArgs, AddCommentArgs } from "@doist/todoist-api-typescript";
import { todoistApiToken } from "@/helpers/preferences";
import { useCachedPromise } from "@raycast/utils";

const api = new TodoistApi(todoistApiToken);

export function useGetProject() {
  const { isLoading, data } = useCachedPromise(
    async () => {
      try {
        const projects = await api.getProjects();
        return projects.results;
      } catch (error) {
        console.error("Error fetching todos:", error);
        return [];
      }
    },
    [],
    {
      initialData: null,
    },
  );
  return { isLoading, data };
}

export function useGetTasks() {
  const { isLoading, data, mutate } = useCachedPromise(
    async () => {
      try {
        const projects = await api.getTasks();
        return projects.results;
      } catch (error) {
        console.error("Error fetching todos:", error);
        return [];
      }
    },
    [],
    {
      initialData: null,
    },
  );
  return { isLoading, data, mutate };
}

export function useGetLabels() {
  const { isLoading, data, mutate } = useCachedPromise(
    async () => {
      try {
        const projects = await api.getLabels();
        return projects.results;
      } catch (error) {
        console.error("Error fetching todos:", error);
        return [];
      }
    },
    [],
    {
      initialData: null,
    },
  );
  return { isLoading, data, mutate };
}

export async function updateTodoistTask(taskId: string, param: UpdateTaskArgs) {
  const response = await api.updateTask(taskId, {
    content: param.content,
    description: param.description,
    priority: param.priority,
    dueString: param.dueString,
    labels: param.labels,
  });
  return response;
}

export async function useCreateTask(param: AddTaskArgs) {
  const response = await api.addTask({
    content: param.content,
    description: param.description,
    priority: param.priority,
    dueString: param.dueString,
    labels: param.labels,
  });
  return response;
}

export async function useAddTimerId(param: AddCommentArgs) {
  const response = await api.addComment({
    content: `@timerID:${param.content}`,
    taskId: param.taskId || "",
  });
  return response;
}
