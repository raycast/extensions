import { APIResponseError, Client } from "@notionhq/client";
import {
  CreatePageParameters,
  QueryDatabaseParameters,
  QueryDatabaseResponse,
  UpdatePageParameters,
} from "@notionhq/client/build/src/api-endpoints";
import { GetJournalsQuery } from "../fetch/GetQueries";

import { addJournalJson } from "./JournalsQueries";
import { Pref, Project } from "../interfaces/itemsInterfaces";
import { getPreferenceValues, showToast } from "@raycast/api";
import { getAPIError, getAPIidFromLink } from "../tools/generalTools";
import { getJournals } from "../fetch/ExportFunctions";
import { FetchActiveTimer } from "../fetch/FetchFunctions";

const getToken = async () => {
  {
    const token = getAPIidFromLink(getPreferenceValues<Pref>().timerAPIID);
    return token;
  }
};

export const QueryAddTimer = async (
  projectID: string,
  projectName: string,
  start: string,
  end: string,
  notion: Client | undefined,
) => {
  const token = await getToken();
  await notion?.pages
    .create(addTimerJson(projectID, projectName, start, end, token) as CreatePageParameters)
    .catch((e: APIResponseError) => {
      return showToast({ title: getAPIError(e.code as string, "Timer") });
    });
  return true;
};

const addTimerJson = (
  projectID: string,
  projectName: string,
  start: string,
  end: string,
  token: string | undefined,
) => {
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
              content: "JOURNAL-" + projectName + "-" + start + "to" + end,
            },
          },
        ],
      },
      Date: {
        date: {
          start: start,
          end: end,
        },
      },
      Projects: {
        relation: [
          {
            id: projectID,
          },
        ],
      },
      Running: {
        checkbox: false,
      },
    },
  };
};

export const QueryStartTimer = async (date: string, notion: Client | undefined) => {
  const token = await getToken();
  await notion?.pages.create(startTimerJson(date, token) as CreatePageParameters).catch((e: APIResponseError) => {
    return showToast({ title: getAPIError(e.code as string, "Timer") });
  });
  if (notion === undefined) return;
  await FetchActiveTimer(["all"], getAPIidFromLink(getPreferenceValues<Pref>().timerAPIID), true, notion);
  return true;
};

export const startTimerJson = (start: string, token: string | undefined) => {
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
              content: "TIMER RUNNING",
            },
          },
        ],
      },
      Date: {
        date: {
          start: start,
        },
      },
      Running: {
        checkbox: true,
      },
    },
  };
};

export const QueryStopTimer = async (
  timerID: string | undefined,
  start: string | undefined,
  end: string,
  project: Project,
  notion: Client | undefined,
) => {
  const jouralAPIID = getAPIidFromLink(getPreferenceValues<Pref>().journalAPIID);
  const today = new Date().toISOString().slice(0, 10);
  const q = GetJournalsQuery(true, project.name, false, today);
  const resJournal = await notion?.databases
    .query({ database_id: jouralAPIID, ...q } as QueryDatabaseParameters)
    .catch((e: APIResponseError) => {
      showToast({ title: getAPIError(e.code as string, "Journal") });
    });
  const journals = getJournals(resJournal as QueryDatabaseResponse);
  if (journals.length !== 0) {
    await notion?.pages
      .update(stopTimerJson(start, end, project.id, timerID, journals[0].id) as UpdatePageParameters)
      .catch((e: APIResponseError) => {
        return showToast({ title: getAPIError(e.code as string, "Timer") });
      });
  } else {
    const res = await notion?.pages.create(
      addJournalJson(
        " ",
        new Date().toISOString().slice(0, 10),
        project.name,
        project.id,
        new Date().toISOString().slice(0, 10).toString(),
        jouralAPIID,
      ) as CreatePageParameters,
    );
    await notion?.pages
      .update(stopTimerJson(start, end, project.id, timerID, res?.id as string) as UpdatePageParameters)
      .catch((e: APIResponseError) => {
        return showToast({ title: getAPIError(e.code as string, "Timer") });
      });
  }
  if (notion === undefined) return;
  await FetchActiveTimer(["all"], getAPIidFromLink(getPreferenceValues<Pref>().timerAPIID), true, notion);
  return true;
};

export const stopTimerJson = (
  start: string | undefined,
  end: string,
  projectID: string,
  id: string | undefined,
  journalID: string,
) => {
  return {
    page_id: id,
    properties: {
      Name: {
        title: [
          {
            text: {
              content: "TIMER-" + start + "to" + end,
            },
          },
        ],
      },
      Date: {
        date: {
          start: start,
          end: end,
        },
      },
      Projects: {
        relation: [
          {
            id: projectID,
          },
        ],
      },
      Running: {
        checkbox: false,
      },
      Journals: {
        relation: [
          {
            id: journalID,
          },
        ],
      },
    },
  };
};
