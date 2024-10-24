import { Client } from "@notionhq/client";
import { QueryDatabaseParameters, QueryDatabaseResponse } from "@notionhq/client/build/src/api-endpoints";
import { getEvents, getJournals, getKeystones, getProjectsList, getTimers, getTodos } from "./ExportFunctions";
import {
  GetEventsQuery,
  GetJournalsQuery,
  GetKeystoneQuery,
  GetProjectQuery,
  GetTimersQuery,
  GetTodosQuery,
} from "./GetQuery";
import { Keystone, Project, ProjectGP } from "../interfaces/interfaceItems";

export const QueryFetchGPProjects = async (apiIDJ: string, apiIDK: string, projects: Project[], notion: Client) => {
  const psGP: ProjectGP[] = [];
  await Promise.all(
    (projects as Project[]).map(async (project) => {
      if (!project.active) return;

      const qLastJournal = { database_id: apiIDJ, ...GetJournalsQuery(true, project.name, true, "") };
      const pJournals = await notion?.databases.query(qLastJournal as QueryDatabaseParameters).then((res) => {
        return res?.results.length === 0 ? null : getJournals(res as QueryDatabaseResponse)[0];
      });

      const qNextKeystone = { database_id: apiIDK, ...GetKeystoneQuery(true, project.name, false, "") };
      const pNextKeystone = await notion?.databases.query(qNextKeystone as QueryDatabaseParameters).then((res) => {
        return res?.results.length === 0 ? null : getKeystones(res as QueryDatabaseResponse)[0];
      });

      const projectGP: ProjectGP = {
        project: project,
        lastJournal: pJournals,
        nextKeystone: pNextKeystone,
        todosRatio: project.todosRatio,
      };
      psGP.push(projectGP);
    }),
  );
  return psGP;
};

export const QueryFetchJournals = async (apiID: string, notion: Client) => {
  const qJournal = { database_id: apiID, ...GetJournalsQuery(true, "Nothing", false, "") };
  const returnedJournals = await notion?.databases.query(qJournal as QueryDatabaseParameters).then((res) => {
    const journals = res?.results.length === 0 || res === undefined ? [] : getJournals(res as QueryDatabaseResponse);
    return journals;
  });
  return returnedJournals;
};

export const QueryFetchActiveProjects = async (apiID: string, notion: Client) => {
  const qProject = { database_id: apiID, ...GetProjectQuery(true) };
  const returnedProjects = await notion?.databases.query(qProject as QueryDatabaseParameters).then((res) => {
    const projects = res?.results.length === 0 ? [] : getProjectsList(res as QueryDatabaseResponse);
    return projects as Project[];
  });
  return returnedProjects;
};

export const QueryFetchAllProjects = async (apiID: string, notion: Client) => {
  const qProject = { database_id: apiID, ...GetProjectQuery(false) };
  const returnedProjects = await notion?.databases.query(qProject as QueryDatabaseParameters).then((res) => {
    const projects = res?.results.length === 0 ? [] : getProjectsList(res as QueryDatabaseResponse);
    return projects as Project[];
  });
  return returnedProjects;
};

export const QueryFetchEvents = async (apiID: string, notion: Client, today: string, onlyToday: boolean) => {
  const qEvent = { database_id: apiID, ...GetEventsQuery(true, "Nothing", !onlyToday, onlyToday, today) };
  const returnedEvents = await notion?.databases.query(qEvent as QueryDatabaseParameters).then((res) => {
    const events = res?.results.length === 0 || res === undefined ? [] : getEvents(res as QueryDatabaseResponse);
    return events;
  });
  return returnedEvents;
};

export const QueryFetchTimers = async (apiID: string, notion: Client, active: boolean) => {
  const qTimer = { database_id: apiID, ...GetTimersQuery(false, active) };
  const returnedTimer = await notion?.databases.query(qTimer as QueryDatabaseParameters).then((res) => {
    const timer = res === undefined || res.results.length === 0 ? null : getTimers(res as QueryDatabaseResponse)[0];
    return timer;
  });
  return returnedTimer;
};

export const QueryFetchKeystones = async (apiID: string, notion: Client, today: string, onlyToday: boolean) => {
  const qTodayKeystone = { database_id: apiID, ...GetKeystoneQuery(true, "Nothing", onlyToday, today) };
  const returnedKeystones = await notion?.databases.query(qTodayKeystone as QueryDatabaseParameters).then((res) => {
    const keys = res?.results.length === 0 || res === undefined ? [] : getKeystones(res as QueryDatabaseResponse);
    return keys as Keystone[];
  });
  return returnedKeystones;
};

export const QueryFetchTodos = async (apiID: string, notion: Client) => {
  const qTodos = { database_id: apiID, ...GetTodosQuery(false, "Nothing") };
  const returnedTodos = await notion?.databases.query(qTodos as QueryDatabaseParameters).then((res) => {
    const todos = res?.results.length === 0 || res === undefined ? [] : getTodos(res as QueryDatabaseResponse);
    return todos;
  });
  return returnedTodos;
};
