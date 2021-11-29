import client, { Product } from "./http";
import { GraphqlData, Manhour, Project, SearchResult, Space, Sprint, Task, User } from "./type";
import { showToast, ToastStyle } from "@raycast/api";
import moment from "moment";

export enum SearchType {
  PROJECT = "project",
  TASK = "task",
  RESOURCE = "resource",
  PAGE = "page",
  SPACE = "space"
}

export enum ManhourType {
  RECORDED = "recorded",
  ESTIMATED = "estimated",
}

export enum ManhourMode {
  DETAILED = "detailed",
  SIMPLE = "simple",
}

export enum ManhourFormat {
  SUM = "sum",
  AVG = "avg",
}

export const MANHOUR_BASE = 100000;

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
    (resp.data.tasks as Task[]).forEach(task => {
      tasks[task.uuid] = task;
    });
    return Promise.resolve(tasks);
  } catch (err) {
    showToast(ToastStyle.Failure, "map tasks failed", (err as Error).message);
    return Promise.reject(err);
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
    showToast(ToastStyle.Failure, "search sprints failed", (err as Error).message);
    return Promise.reject(err);
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
    (resp.data.users as User[]).forEach(user => {
      users[user.uuid as string] = user;
    });
    return Promise.resolve(users);
  } catch (err) {
    showToast(ToastStyle.Failure, "map users failed", (err as Error).message);
    return Promise.reject(err);
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
    (resp.data.spaces as Space[]).forEach(space => {
      spaces[space.uuid as string] = space;
    });
    return Promise.resolve(spaces);
  } catch (err) {
    showToast(ToastStyle.Failure, "map spaces failed", (err as Error).message);
    return Promise.reject(err);
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
    (resp.data.projects as Project[]).forEach(project => {
      projects[project.uuid as string] = project;
    });
    return Promise.resolve(projects);
  } catch (err) {
    showToast(ToastStyle.Failure, "map projects failed", (err as Error).message);
    return Promise.reject(err);
  }
}

export async function search(product: Product, q: string, types: SearchType[], start?: number): Promise<SearchResult> {
  const params = {
    q,
    limit: 200,
    start: start ? start : 0,
    types: types.join(",")
  };
  try {
    const resp = await client.get(product, "search", params);
    showToast(ToastStyle.Success, `Took ${resp.took_time}ms`);
    return Promise.resolve(resp as SearchResult);
  } catch (err) {
    showToast(ToastStyle.Failure, "search failed", (err as Error).message);
    return Promise.reject(err);
  }
}

export async function listManhours(userUUID: string, startDate: string, endDate?: string): Promise<Manhour[]> {
  endDate = endDate ? endDate : moment().format("YYYY-MM-DD");
  const query = `
  {
    manhours (
      filter: {
        owner_equal: "${userUUID}"
        startTime_range: {
            gte: "${startDate}"
            lte: "${endDate}"
        }
        type_equal: "recorded"
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
    showToast(ToastStyle.Failure, "list manhours failed", (err as Error).message);
    return Promise.reject(err);
  }
}

export async function getUserByName(name: string): Promise<User> {
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
    if (resp.data.users.length === 0) {
      showToast(ToastStyle.Failure, "user not found");
      return Promise.reject(new Error("user not found"));
    }
    return Promise.resolve(resp.data.users[0]);
  } catch (err) {
    showToast(ToastStyle.Failure, "get user failed", (err as Error).message);
    return Promise.reject(err);
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
    mode: ManhourMode.DETAILED,
    start_time: manhour.startTime,
    hours: manhour.hours,
    description: manhour.description
  };
  const data: GraphqlData = { query, variables };
  try {
    await client.post(Product.PROJECT, "items/graphql", data);
    return Promise.resolve();
  } catch (err) {
    showToast(ToastStyle.Failure, "add manhour failed", (err as Error).message);
    return Promise.reject(err);
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
    mode: ManhourMode.DETAILED,
    owner: manhour.owner.uuid,
    task: manhour.task.uuid,
    type: manhour.type,
    start_time: manhour.startTime,
    hours: manhour.hours,
    description: manhour.description,
    key: `manhour-${manhour.uuid}`
  };
  const data: GraphqlData = { query, variables };
  try {
    await client.post(Product.PROJECT, "items/graphql", data);
    return Promise.resolve();
  } catch (err) {
    showToast(ToastStyle.Failure, "update manhour failed", (err as Error).message);
    return Promise.reject(err);
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
    mode: ManhourMode.DETAILED
  };
  const data: GraphqlData = { query, variables };
  try {
    await client.post(Product.PROJECT, "items/graphql", data);
    return Promise.resolve();
  } catch (err) {
    showToast(ToastStyle.Failure, "delete manhour failed", (err as Error).message);
    return Promise.reject(err);
  }
}
