// api.ts
import axios from "axios";
import { Employee } from "../entities/employee";
import { Project } from "../entities/project";
import { NewTaskMsg, Task } from "../entities/task";
import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "../entities/preferences";

const api = axios.create({
  baseURL: "https://management.incetro.agency/api",
});

api.interceptors.request.use((config) => {
  const prefs = getPreferenceValues<Preferences>();
  if (prefs) {
    config.headers.Authorization = `Bearer ${prefs.api_key}`;
  }
  return config;
});

export class HTTPRepository {
  static GetEmployees = async (): Promise<Employee[]> => {
    const { data } = await api.get("/tracker/employees");
    return data.map((emp: { id: string; username: string }) => ({
      id: emp.id,
      username: emp.username,
    }));
  };

  static GetProjects = async (employee: Employee): Promise<Project[]> => {
    const { data } = await api.get("/tracker/projects", {
      params: {
        user_id: employee.id,
      },
    });
    return data;
  };

  static GetTasks = async (employee: Employee, project: Project): Promise<Task[]> => {
    const { data } = await api.get("/tracker/tasks", {
      params: {
        user_id: employee.id,
        project_id: project.id,
      },
    });
    return data;
  };

  static WriteOfTime = async (
    employee: Employee,
    project: Project,
    task: Task,
    duration: number,
    description: string,
    workDate: Date,
  ): Promise<Task[]> => {
    const { data } = await api.post("/time", {
      taskID: task.id,
      employeeID: employee.id,
      projectID: project.id,
      duration: duration * 60 * 60,
      description: description,
      workDate: workDate.toISOString(),
    });
    return data;
  };

  static CreateTask = async (task: NewTaskMsg) => {
    await api.post("/task", {
      projectID: task.projectID,
      executorID: task.executorID,
      task: task.task,
      estimate: task.estimate,
      priority: task.priority,
      start: task.start,
      end: task.end,
    });
  };
}
