import { Cache } from "@raycast/api";
import {
  GetEventsQuery,
  GetJournalsQuery,
  GetKeystoneQuery,
  GetLinksQuery,
  GetProjectQuery,
  GetTimersQuery,
  GetTodosQuery,
} from "./GetQuery";
import { dataToStr, strToData } from "../tools/generalTools";
import { QueryDatabaseParameters, QueryDatabaseResponse } from "@notionhq/client/build/src/api-endpoints";
import { APIResponseError, Client } from "@notionhq/client";
import { Evnt, Journal, Keystone, Link, Project, ProjectGP, Timer, Todo } from "../interfaces/interfaceItems";
import {
  getEvents,
  getJournals,
  getKeystones,
  getLinks,
  getProjectsList,
  getTimers,
  getTodos,
} from "./ExportFunctions";

const cache = new Cache();

export const FetchActiveProjects = async (targets: string[], apiID: string, forceRefresh: boolean, notion: Client) => {
  if (!(targets.includes("project") || targets.includes("all")))
    return (cache.has("activeProject") ? strToData(cache.get("activeProject") as string) : []) as Project[];
  if (forceRefresh || !cache.has("activeProject")) {
    const qProject = { database_id: apiID, ...GetProjectQuery(true) };
    const returnedProjects = await notion?.databases
      .query(qProject as QueryDatabaseParameters)
      .then((res) => {
        const projects = res?.results.length === 0 ? [] : getProjectsList(res as QueryDatabaseResponse);
        cache.set("activeProject", dataToStr(projects as Project[]));
        return projects as Project[];
      })
      .catch(async (e: APIResponseError) => {
        return e.code as string;
      });
    return returnedProjects;
  } else return strToData(cache.get("activeProject") as string) as Project[];
};

export const FetchAllProjects = async (targets: string[], apiID: string, forceRefresh: boolean, notion: Client) => {
  if (!(targets.includes("project") || targets.includes("all")))
    return (cache.has("allProject") ? strToData(cache.get("allProject") as string) : []) as Project[];
  if (forceRefresh || !cache.has("allProject")) {
    const qProject = { database_id: apiID, ...GetProjectQuery(false) };
    const returned = await notion?.databases
      .query(qProject as QueryDatabaseParameters)
      .then((res) => {
        const projects = res?.results.length === 0 ? [] : getProjectsList(res as QueryDatabaseResponse);
        cache.set("allProject", dataToStr(projects as Project[]));

        return projects as Project[];
      })
      .catch((e: APIResponseError) => {
        return e.code as string;
      });

    return returned;
  } else return strToData(cache.get("allProject") as string) as Project[];
};

export const FetchGeneralPilotProjects = async (
  targets: string[],
  apiIDJ: string,
  apiIDK: string,
  projects: Project[],
  forceRefresh: boolean,
  notion: Client,
) => {
  if (!(targets.includes("project") || targets.includes("all")))
    return (cache.has("gpProjects") ? strToData(cache.get("gpProjects") as string) : []) as ProjectGP[];
  if (forceRefresh || !cache.has("gpProjects")) {
    let error = "";
    const psGP: ProjectGP[] = [];
    await Promise.all(
      (projects as Project[]).map(async (project) => {
        if (!project.active) return;

        const qLastJournal = { database_id: apiIDJ, ...GetJournalsQuery(true, project.name, true, "") };
        const pJournals = await notion?.databases
          .query(qLastJournal as QueryDatabaseParameters)
          .then((res) => {
            return res?.results.length === 0 ? null : getJournals(res as QueryDatabaseResponse)[0];
          })
          .catch(async (e: APIResponseError) => {
            error = e.code as string;
            return null;
          });

        const qNextKeystone = { database_id: apiIDK, ...GetKeystoneQuery(true, project.name, false, "") };
        const pNextKeystone = await notion?.databases
          .query(qNextKeystone as QueryDatabaseParameters)
          .then((res) => {
            return res?.results.length === 0 ? null : getKeystones(res as QueryDatabaseResponse)[0];
          })
          .catch(async (e: APIResponseError) => {
            error = e.code as string;
            return null;
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
    if (error.length > 0) {
      return error;
    } else {
      cache.set("gpProjects", dataToStr(psGP));
      return psGP;
    }
  } else return strToData(cache.get("gpProjects") as string) as ProjectGP[];
};

export const FetchActiveTimer = async (targets: string[], apiID: string, forceRefresh: boolean, notion: Client) => {
  if (!(targets.includes("timer") || targets.includes("all")))
    return (cache.has("activeTimer") ? strToData(cache.get("activeTimer") as string) : null) as Timer;
  if (forceRefresh || !cache.has("activeTimer")) {
    const qTimer = { database_id: apiID, ...GetTimersQuery(false, true) };
    const returnedTimer = await notion?.databases
      .query(qTimer as QueryDatabaseParameters)
      .then((res) => {
        const timer = res === undefined || res.results.length === 0 ? null : getTimers(res as QueryDatabaseResponse)[0];
        cache.set("activeTimer", dataToStr(timer));
        return timer;
      })
      .catch((e: APIResponseError) => {
        return e.code as string;
      });
    return returnedTimer;
  } else return strToData(cache.get("activeTimer") as string) as Timer;
};

export const FetchTodayKeystones = async (
  targets: string[],
  apiID: string,
  forceRefresh: boolean,
  today: string,
  notion: Client,
) => {
  if (!(targets.includes("keystone") || targets.includes("all")))
    return (cache.has("todayKeystones") ? strToData(cache.get("todayKeystones") as string) : []) as Keystone[];
  if (forceRefresh || !cache.has("todayKeystones")) {
    const qTodayKeystone = { database_id: apiID, ...GetKeystoneQuery(true, "Nothing", true, today) };
    const returnedKeys = await notion?.databases
      .query(qTodayKeystone as QueryDatabaseParameters)
      .then((res) => {
        const keys = res?.results.length === 0 || res === undefined ? [] : getKeystones(res as QueryDatabaseResponse);
        cache.set("todayKeystones", dataToStr(keys));
        return keys;
      })
      .catch((e: APIResponseError) => {
        return e.code as string;
      });
    return returnedKeys;
  } else return strToData(cache.get("todayKeystones") as string) as Keystone[];
};

export const FetchKeystones = async (
  targets: string[],
  apiID: string,
  forceRefresh: boolean,
  today: string,
  notion: Client,
) => {
  if (!(targets.includes("keystone") || targets.includes("all")))
    return (cache.has("keystones") ? strToData(cache.get("keystones") as string) : []) as Keystone[];
  if (forceRefresh || !cache.has("keystones")) {
    const qTodayKeystone = { database_id: apiID, ...GetKeystoneQuery(true, "Nothing", false, today) };
    const returnedKeystones = await notion?.databases
      .query(qTodayKeystone as QueryDatabaseParameters)
      .then((res) => {
        const keys = res?.results.length === 0 || res === undefined ? [] : getKeystones(res as QueryDatabaseResponse);
        cache.set("keystones", dataToStr(keys));
        return keys as Keystone[];
      })
      .catch((e: APIResponseError) => {
        return e.code as string;
      });
    return returnedKeystones;
  } else return strToData(cache.get("keystones") as string) as Keystone[];
};

export const FetchTodayEvents = async (
  targets: string[],
  apiID: string,
  forceRefresh: boolean,
  today: string,
  notion: Client,
) => {
  if (!(targets.includes("event") || targets.includes("all")))
    return (cache.has("todayEvents") ? strToData(cache.get("todayEvents") as string) : []) as Evnt[];
  if (forceRefresh || !cache.has("todayEvents")) {
    const qEvent = { database_id: apiID, ...GetEventsQuery(true, "Nothing", false, true, today) };
    const returnedEvents = await notion?.databases
      .query(qEvent as QueryDatabaseParameters)
      .then((res) => {
        const events = res?.results.length === 0 || res === undefined ? [] : getEvents(res as QueryDatabaseResponse);
        cache.set("todayEvents", dataToStr(events));
        return events;
      })
      .catch((e: APIResponseError) => {
        return e.code as string;
      });
    return returnedEvents;
  } else return strToData(cache.get("todayEvents") as string) as Evnt[];
};

export const FetchEvents = async (
  targets: string[],
  apiID: string,
  forceRefresh: boolean,
  today: string,
  notion: Client,
) => {
  if (!(targets.includes("event") || targets.includes("all")))
    return (cache.has("events") ? strToData(cache.get("events") as string) : []) as Evnt[];
  if (forceRefresh || !cache.has("events")) {
    const qEvent = { database_id: apiID, ...GetEventsQuery(true, "Nothing", true, false, today) };
    const returnedEvents = await notion?.databases
      .query(qEvent as QueryDatabaseParameters)
      .then((res) => {
        const events = res?.results.length === 0 || res === undefined ? [] : getEvents(res as QueryDatabaseResponse);
        cache.set("events", dataToStr(events));
        return events;
      })
      .catch((e: APIResponseError) => {
        return e.code as string;
      });
    return returnedEvents;
  } else return strToData(cache.get("events") as string) as Evnt[];
};

export const FetchedTodos = async (targets: string[], apiID: string, forceRefresh: boolean, notion: Client) => {
  if (!(targets.includes("todo") || targets.includes("all")))
    return (cache.has("todos") ? strToData(cache.get("todos") as string) : []) as Todo[];
  if (forceRefresh || !cache.has("todos")) {
    const qTodos = { database_id: apiID, ...GetTodosQuery(false, "Nothing") };
    const returnedTodos = await notion?.databases
      .query(qTodos as QueryDatabaseParameters)
      .then((res) => {
        const todos = res?.results.length === 0 || res === undefined ? [] : getTodos(res as QueryDatabaseResponse);
        cache.set("todos", dataToStr(todos));
        return todos;
      })
      .catch((e: APIResponseError) => {
        return e.code as string;
      });

    return returnedTodos;
  } else return strToData(cache.get("todos") as string) as Todo[];
};

export const FetchJournals = async (targets: string[], apiID: string, forceRefresh: boolean, notion: Client) => {
  const fetch = async () => {
    const qJournal = { database_id: apiID, ...GetJournalsQuery(true, "Nothing", false, "") };
    const returnedJournals = await notion?.databases
      .query(qJournal as QueryDatabaseParameters)
      .then((res) => {
        const journals =
          res?.results.length === 0 || res === undefined ? [] : getJournals(res as QueryDatabaseResponse);
        cache.set("journals", dataToStr(journals));
        return journals;
      })
      .catch((e: APIResponseError) => {
        return e.code as string;
      });
    return returnedJournals;
  };
  if (!(targets.includes("journal") || targets.includes("all")))
    return (cache.has("journals") ? strToData(cache.get("journals") as string) : []) as Journal[];
  if (forceRefresh || !cache.has("journals")) {
    const journals: Journal[] | string = await fetch();
    return journals;
  } else {
    return strToData(cache.get("journals") as string) as Journal[];
  }
};

export const FetchLinks = async (targets: string[], apiID: string, forceRefresh: boolean, notion: Client) => {
  if (!(targets.includes("link") || targets.includes("all")))
    return (cache.has("links") ? strToData(cache.get("links") as string) : []) as Link[];
  if (forceRefresh || !cache.has("links")) {
    const qLinks = { database_id: apiID, ...GetLinksQuery(true) };
    const returnedLinks = await notion?.databases
      .query(qLinks as QueryDatabaseParameters)
      .then((res) => {
        const links = res?.results.length === 0 || res === undefined ? [] : getLinks(res as QueryDatabaseResponse);
        cache.set("links", dataToStr(links));
        return links as Link[];
      })
      .catch((e: APIResponseError) => {
        return e.code;
      });
    return returnedLinks;
  } else return strToData(cache.get("links") as string) as Link[];
};
