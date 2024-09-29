import { Journal, Keystone, Pref, Project, Todo } from "../interfaces/interfaceItems";
import { addJournalJson } from "./JournalsQueries";
import { APIResponseError, Client } from "@notionhq/client";
import {
  CreatePageParameters,
  QueryDatabaseParameters,
  QueryDatabaseResponse,
  UpdatePageParameters,
} from "@notionhq/client/build/src/api-endpoints";
import { GetJournalsQuery } from "../fetch/GetQuery";
import { getPreferenceValues, showToast } from "@raycast/api";
import { getAPIError } from "../tools/generalTools";
import { getJournals } from "../fetch/ExportFunctions";

const getToken = async () => {
  const token = getPreferenceValues<Pref>().todoAPIID;
  return token;
};

export const QuerySetTodosUndoneFromJournal = async (journal: Journal, notion: Client | undefined) => {
  journal.todos.forEach(async (todo) => {
    await QueryToogleTodo(todo, notion).catch((e: APIResponseError) => {
      return showToast({ title: getAPIError(e.code as string, "Todo") });
    });
  });
};

export const QueryToogleTodo = async (todo: Todo, notion: Client | undefined) => {
  const today = new Date().toISOString().slice(0, 10);
  const bool = !todo.checkbox;

  if (bool) {
    const jouralAPIID = getPreferenceValues<Pref>().journalAPIID;
    const q = GetJournalsQuery(true, todo.project.name, false, today);
    const resJournal = await notion?.databases
      .query({ database_id: jouralAPIID as string, ...q } as QueryDatabaseParameters)
      .catch((e: APIResponseError) => {
        return showToast({ title: getAPIError(e.code as string, "Journal") });
      });

    const journals = getJournals(resJournal as QueryDatabaseResponse);
    if (journals.length !== 0) {
      await notion?.pages
        .update({
          page_id: todo.id,
          properties: {
            Journals: {
              relation: [
                {
                  id: journals[0].id,
                },
              ],
            },
            Checkbox: {
              checkbox: true,
            },
          },
        })
        .catch((e: APIResponseError) => {
          return showToast({ title: getAPIError(e.code as string, "Todo") });
        });
      return;
    } else {
      const res = await notion?.pages.create(
        addJournalJson(
          " ",
          new Date().toISOString().slice(0, 10),
          todo?.project.name,
          todo?.project.id,
          new Date().toISOString().slice(0, 10).toString(),
          jouralAPIID,
        ) as CreatePageParameters,
      );
      await notion?.pages
        .update(addRelationJournalTodoJson(res?.id as string, todo?.id))
        .catch((e: APIResponseError) => {
          return showToast({ title: getAPIError(e.code as string, "Journal") });
        });
      return;
    }
  } else {
    await notion?.pages
      .update({
        page_id: todo.id,
        properties: {
          Journals: {
            relation: [],
          },
          Checkbox: {
            checkbox: false,
          },
        },
      })
      .catch((e: APIResponseError) => {
        return showToast({ title: getAPIError(e.code as string, "Todo") });
      });
    return;
  }
};

export const QueryAddTodo = async (projects: unknown[], filter: string, search: string, notion: Client | undefined) => {
  const token = await getToken();
  const projectID = (projects.find((p) => (p as Project).name === filter) as Project)?.id;
  const q = await notion?.pages
    .create(addTodoJson(search, projectID, token) as CreatePageParameters)
    .then(() => {
      return "ok";
    })
    .catch((e: APIResponseError) => {
      return showToast({ title: getAPIError(e.code as string, "Todo") });
    });
  return q;
};

export const QueryAddTodoForm = async (
  name: string,
  projectID: string,
  keystoneID: string,
  notion: Client | undefined,
) => {
  const token = await getToken();
  await notion?.pages
    .create(addTodoWithKeystoneJson(name, projectID, keystoneID, token) as CreatePageParameters)
    .catch((e: APIResponseError) => {
      return showToast({ title: getAPIError(e.code as string, "Todo") });
    });
  return true;
};

export const QueryUnlinkTodo = async (id: string, notion: Client | undefined) => {
  await notion?.pages.update(unlinkTodo(id)).catch((e: APIResponseError) => {
    return showToast({ title: getAPIError(e.code as string, "Todo") });
  });
  return true;
};

const addTodoJson = (name: string, projectID: string | undefined, token: string | undefined) => {
  return {
    icon: {
      type: "emoji",
      emoji: "📋",
    },
    parent: {
      type: "database_id",
      database_id: token,
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
      Checkbox: {
        checkbox: false,
      },
      Projects: {
        relation: [
          {
            id: projectID,
          },
        ],
      },
    },
  };
};
const addTodoWithKeystoneJson = (name: string, projectID: string, keystoneID: string, token: string | undefined) => {
  return {
    icon: {
      type: "emoji",
      emoji: "📋",
    },
    parent: {
      type: "database_id",
      database_id: token,
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
      Checkbox: {
        checkbox: false,
      },
      Projects: {
        relation: [
          {
            id: projectID,
          },
        ],
      },
      Keystones: {
        relation: [
          {
            id: keystoneID,
          },
        ],
      },
    },
  };
};

export const QuerySetKeystoneAndTodo = async (keystone: Keystone, todo: Todo, notion: Client | undefined) => {
  await notion?.pages
    .update(addRelationKeystoneTodoJson(keystone.id, todo.id) as UpdatePageParameters)
    .catch((e: APIResponseError) => {
      return showToast({ title: getAPIError(e.code as string, "Todo") });
    });
  return true;
};

const unlinkTodo = (id: string) => {
  return {
    page_id: id,
    properties: {
      Keystones: {
        relation: [],
      },
    },
  };
};

//JSON -------------------------

const addRelationKeystoneTodoJson = (keystoneID: string | undefined, id: string) => {
  return {
    page_id: id,
    properties: {
      Keystones: {
        relation: [
          {
            id: keystoneID,
          },
        ],
      },
    },
  };
};

const addRelationJournalTodoJson = (journalID: string, id: string) => {
  return {
    page_id: id,
    properties: {
      Journals: {
        relation: [
          {
            id: journalID,
          },
        ],
      },
      Checkbox: {
        checkbox: true,
      },
    },
  };
};
