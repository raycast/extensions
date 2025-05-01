// api.ts
import axios from "axios";
import { Employee } from "../entities/employee";
import { Project } from "../entities/project";
import { Task } from "../entities/task";

const api = axios.create({
  baseURL: "https://management.incetro.agency/api", // замените на нужный URL
  headers: {
    Authorization: "Bearer NBXdfNC8H2w7q6T8x5imBx6h0wC0euoT",
  },
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
  ): Promise<Task[]> => {
    const { data } = await api.post("/tracker/time", {
      taskID: task.id,
      employeeID: employee.id,
      projectID: project.id,
      duration: duration * 60 * 60,
      description: description,
    });
    return data;
  };
}
