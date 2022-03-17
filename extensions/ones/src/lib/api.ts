import client, { Product } from "./client";
import { GraphqlData, LoginResult, Manhour, Project, SearchResult, Space, Sprint, Task, User } from "./type";
import { clearLocalStorage, preferences, showToast, ToastStyle } from "@raycast/api";
import moment from "moment";
import axios from "axios";

export enum SearchType {
  PROJECT = "project",
  TASK = "task",
  RESOURCE = "resource",
  PAGE = "page",
  SPACE = "space",
}

export enum ManhourType {
  RECORDED = "recorded",
  ESTIMATED = "estimated",
}

export enum ManhourFormat {
  SUM = "sum",
  AVG = "avg",
}

export const MANHOUR_BASE = 100000;

export function manhourMode(): string {
  return (preferences.manhourMode.value ? preferences.manhourMode.value : preferences.manhourMode.default) as string;
}

export async function mapTasks(uuids: string[]): Promise<{ [key: string]: Task }> {
  const query = `
  {
    tasks (
      filter: {
        uuid_in: ["${uuids.join(`","`)}"]
      }
    ) {
      uuid
      name
      number
      priority {
        uuid
        value
      }
    }
  }`;
  const data: GraphqlData = { query };
  try {
    const resp = await client.post(Product.PROJECT, "items/graphql", data);
    const tasks: { [key: string]: Task } = {};
    (resp.data.tasks as Task[]).forEach((task) => {
      tasks[task.uuid] = task;
    });
    return Promise.resolve(tasks);
  } catch (err) {
    return Promise.reject(new Error(`map tasks failed: ${(err as Error).message}`));
  }
}

export async function searchSprints(key: string): Promise<Sprint[]> {
  const query = `
  {
    sprints (
      filterGroup: [
        {
          name_match: "${key}"
        },
        {
          description_match: "${key}"
        }
        {
          assign: {
            name_match: "${key}"
          }
        }
      ]
      limit: 200
    ) {
      uuid
      name
      description
      assign {
        uuid
        name
      }
      project {
        uuid
        name
      }
      planStartTime
      planEndTime
    }
  }`;
  const data: GraphqlData = { query };
  try {
    const resp = await client.post(Product.PROJECT, "items/graphql", data);
    return Promise.resolve(resp.data.sprints as Sprint[]);
  } catch (err) {
    return Promise.reject(`search sprints failed: ${(err as Error).message}`);
  }
}

export async function mapUsers(uuids: string[]): Promise<{ [key: string]: User }> {
  const query = `
  {
    users (
      filter: {
        uuid_in: ["${uuids.join(`","`)}"]
      }
    ) {
      uuid
      name
      avatar
    }
  }`;
  const data: GraphqlData = { query };
  try {
    const resp = await client.post(Product.PROJECT, "items/graphql", data);
    const users = {} as { [key: string]: User };
    (resp.data.users as User[]).forEach((user) => {
      users[user.uuid as string] = user;
    });
    return Promise.resolve(users);
  } catch (err) {
    return Promise.reject(new Error(`map users failed: ${(err as Error).message}`));
  }
}

export async function mapSpaces(uuids: string[]): Promise<{ [key: string]: Space }> {
  const query = `
  {
    spaces (
      filter: {
        uuid_in: ["${uuids.join(`","`)}"]
      }
    ) {
      uuid
      name
    }
  }`;
  const data: GraphqlData = { query };
  try {
    const resp = await client.post(Product.WIKI, "items/graphql", data);
    const spaces = {} as { [key: string]: Space };
    (resp.data.spaces as Space[]).forEach((space) => {
      spaces[space.uuid as string] = space;
    });
    return Promise.resolve(spaces);
  } catch (err) {
    return Promise.reject(new Error(`map spaces failed: ${(err as Error).message}`));
  }
}

export async function mapProjects(uuids: string[]): Promise<{ [key: string]: Project }> {
  const query = `
  {
    projects (
      filter: {
        uuid_in: ["${uuids.join(`","`)}"]
      }
    ) {
      uuid
      name
    }
  }`;
  const data: GraphqlData = { query };
  try {
    const resp = await client.post(Product.PROJECT, "items/graphql", data);
    const projects = {} as { [key: string]: Project };
    (resp.data.projects as Project[]).forEach((project) => {
      projects[project.uuid as string] = project;
    });
    return Promise.resolve(projects);
  } catch (err) {
    return Promise.reject(new Error(`map projects failed: ${(err as Error).message}`));
  }
}

export async function search(product: Product, q: string, types: SearchType[], start?: number): Promise<SearchResult> {
  const params = {
    q,
    limit: 200,
    start: start ? start : 0,
    types: types.join(","),
  };
  try {
    const resp = await client.get(product, "search", params);
    showToast(ToastStyle.Success, `Took ${resp.took_time}ms`);
    return Promise.resolve(resp as SearchResult);
  } catch (err) {
    return Promise.reject(new Error(`search failed: ${(err as Error).message}`));
  }
}

interface ListManhoursParams {
  userUUID: string;
  startDate: string;
  endDate?: string;
  taskUUID?: string;
}

export async function listManhours(params: ListManhoursParams): Promise<Manhour[]> {
  params.endDate = params.endDate ? params.endDate : moment().format("YYYY-MM-DD");
  const queryTask = params.taskUUID ? `uuid_equal: "${params.taskUUID}"` : "";
  const query = `
  {
    manhours (
      filter: {
        owner_equal: "${params.userUUID}"
        startTime_range: {
            gte: "${params.startDate}"
            lte: "${params.endDate}"
        }
        task: {
          ${queryTask}
        }
      }
    ) {
      uuid
      hours
      startTime
      owner {
        uuid
        avatar
      }
      task {
        uuid
        name
        number
        project {
          name
        }
      }
      description
      type
    }
  }`;
  const data: GraphqlData = { query };
  try {
    const resp = await client.post(Product.PROJECT, "items/graphql", data);
    return Promise.resolve(resp.data.manhours);
  } catch (err) {
    return Promise.reject(new Error(`list manhours failed: ${(err as Error).message}`));
  }
}

export async function listUsersByName(name: string): Promise<User[]> {
  const query = `
  {
    users (
      filter: {
        name_equal: "${name}"
      }
    ) {
      uuid
      name
      avatar
    }
  }`;
  const data: GraphqlData = { query };
  try {
    const resp = await client.post(Product.PROJECT, "items/graphql", data);
    return Promise.resolve(resp.data.users);
  } catch (err) {
    return Promise.reject(new Error(`list users by name failed: ${(err as Error).message}`));
  }
}

export async function addManhour(manhour: Manhour): Promise<void> {
  const query = `
  mutation AddManhour {
    addManhour (
      task: $task
      type: $type
      owner: $owner
      hours_format: $hours_format
      mode: $mode
      start_time: $start_time
      hours: $hours
      description: $description
    ) {
      uuid
    }
  }`;
  const variables = {
    task: manhour.task.uuid,
    type: manhour.type,
    owner: manhour.owner.uuid,
    hours_format: ManhourFormat.SUM,
    mode: manhourMode(),
    start_time: manhour.startTime,
    hours: manhour.hours,
    description: manhour.description,
  };
  const data: GraphqlData = { query, variables };
  try {
    await client.post(Product.PROJECT, "items/graphql", data);
  } catch (err) {
    return Promise.reject(new Error(`add manhour failed: ${(err as Error).message}`));
  }
}

export async function updateManhour(manhour: Manhour): Promise<void> {
  const query = `
  mutation UpdateManhour {
    updateManhour (
      mode: $mode
      owner: $owner
      task: $task
      type: $type
      start_time: $start_time
      hours: $hours
      description: $description
      key: $key
    ) {
      key
    }
  }`;
  const variables = {
    mode: manhourMode(),
    owner: manhour.owner.uuid,
    task: manhour.task.uuid,
    type: manhour.type,
    start_time: manhour.startTime,
    hours: manhour.hours,
    description: manhour.description,
    key: `manhour-${manhour.uuid}`,
  };
  const data: GraphqlData = { query, variables };
  try {
    await client.post(Product.PROJECT, "items/graphql", data);
  } catch (err) {
    return Promise.reject(new Error(`update manhour failed: ${(err as Error).message}`));
  }
}

export async function deleteManhour(uuid: string): Promise<void> {
  const query = `
  mutation DeleteManhour {
    deleteManhour (
      key: $key
      mode: $mode
    ) {
      key
    }
  }`;
  const variables = {
    key: `manhour-${uuid}`,
    mode: manhourMode(),
  };
  const data: GraphqlData = { query, variables };
  try {
    await client.post(Product.PROJECT, "items/graphql", data);
    return Promise.resolve();
  } catch (err) {
    return Promise.reject(new Error(`delete manhour failed: ${(err as Error).message}`));
  }
}

export async function login(data: { email: string; password: string }): Promise<LoginResult> {
  try {
    const resp = await axios.post(`${preferences.url.value}/project/api/project/auth/login`, data, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return Promise.resolve(resp.data as LoginResult);
  } catch (err) {
    await clearLocalStorage();
    return Promise.reject(new Error(`login failed: ${(err as Error).message}`));
  }
}

export async function deleteTask(uuid: string): Promise<void> {
  try {
    await client.post(Product.PROJECT, `task/${uuid}/delete`);
  } catch (err) {
    return Promise.reject(new Error(`delete task failed: ${(err as Error).message}`));
  }
}
