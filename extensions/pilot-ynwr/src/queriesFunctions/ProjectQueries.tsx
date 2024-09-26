import { APIResponseError, Client } from "@notionhq/client";
import {
  CreatePageParameters,
  QueryDatabaseParameters,
  UpdatePageParameters,
} from "@notionhq/client/build/src/api-endpoints";
import { Cache, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { Pref, Project } from "../interfaces/interfaceItems";
import { getAPIError, getAPIidFromLink } from "../tools/generalTools";
import { getTimers } from "../fetch/ExportFunctions";
import { FetchedTodos, FetchEvents, FetchJournals, FetchKeystones } from "../fetch/FetchFunctions";

const getID = async () => {
  const token = getAPIidFromLink(getPreferenceValues<Pref>().projectAPIID);
  return token;
};

export const QueryAddProject = async (name: string, icon: string, notion: Client | undefined) => {
  const idDB = await getID();
  await notion?.pages.create(addProjecctJson(name, icon, idDB) as CreatePageParameters).catch((e: APIResponseError) => {
    return showToast({ title: getAPIError(e.code as string, "Project") });
  });
  return true;
};

export const QueryChangeActiveProject = async (id: string, active: boolean, notion: Client | undefined) => {
  await notion?.pages
    .update(changeActiveProjectJson(active, id) as UpdatePageParameters)
    .catch((e: APIResponseError) => {
      return showToast({ title: getAPIError(e.code as string, "Project") });
    });
  return true;
};

// JSON -------------------------------
const addProjecctJson = (name: string, icon: string, token: string | undefined) => {
  return {
    parent: {
      type: "database_id",
      database_id: token,
    },
    icon: {
      emoji: icon,
    },
    properties: {
      Name: {
        title: [
          {
            text: {
              content: name,
            },
          },
        ],
      },
      Icon: {
        rich_text: [
          {
            text: {
              content: icon,
            },
          },
        ],
      },
      Active: {
        checkbox: true,
      },
    },
  };
};

const changeActiveProjectJson = (active: boolean, id: string) => {
  return {
    page_id: id,
    properties: {
      Active: {
        checkbox: active,
      },
    },
  };
};

export const QueryDeleteProject = async (project: Project, cache: Cache, notion: Client | undefined) => {
  if (notion === undefined) return;

  const qTimer: QueryDatabaseParameters = {
    database_id: getAPIidFromLink(getPreferenceValues<Pref>().timerAPIID),
    filter: {
      and: [{ property: "Projects", relation: { contains: project.id } }],
    },
  };
  const resTimers = await notion?.databases.query(qTimer);
  const timers = resTimers === undefined ? [] : getTimers(resTimers);

  const events = await FetchEvents(["all"], getAPIidFromLink(getPreferenceValues<Pref>().eventAPIID), true, "", notion);
  if (typeof events === "string") {
    showToast({ title: getAPIError(events, "Events"), style: Toast.Style.Failure });
    return;
  }
  const journals = await FetchJournals(
    ["all"],
    getAPIidFromLink(getPreferenceValues<Pref>().journalAPIID),
    true,
    notion,
  );
  if (typeof journals === "string") {
    showToast({ title: getAPIError(journals, "Journals"), style: Toast.Style.Failure });
    return;
  }
  const keystones = await FetchKeystones(
    ["all"],
    getAPIidFromLink(getPreferenceValues<Pref>().keystoneAPIID),
    true,
    "",
    notion,
  );
  if (typeof keystones === "string") {
    showToast({ title: getAPIError(keystones, "Keystones"), style: Toast.Style.Failure });
    return;
  }
  const links = project.links;
  const todos = await FetchedTodos(["all"], getAPIidFromLink(getPreferenceValues<Pref>().todoAPIID), true, notion);
  if (typeof todos === "string") {
    showToast({ title: getAPIError(todos, "Todos"), style: Toast.Style.Failure });
    return;
  }

  const items = [...timers, ...events, ...journals, ...keystones, ...links, ...todos];
  const filteredItems = items.filter((item) => item.project.id === project.id);
  filteredItems.forEach(async (item) => {
    await notion?.pages.update(deleteItemJson(item.id));
  });

  await notion?.pages.update(deleteItemJson(project.id)).catch((e: APIResponseError) => {
    return showToast({ title: getAPIError(e.code as string, "Item") });
  });

  return true;
};

const deleteItemJson = (id: string) => {
  const params: UpdatePageParameters = {
    page_id: id,
    in_trash: true,
  };
  return params;
};
