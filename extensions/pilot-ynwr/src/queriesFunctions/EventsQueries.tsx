import { LocalStorage, showToast } from "@raycast/api";
import { APIResponseError, Client } from "@notionhq/client";
import { CreatePageParameters, UpdatePageParameters } from "@notionhq/client/build/src/api-endpoints";

import { getAPIError } from "../tools/generalTools";

const getID = async () => {
  const token = (await LocalStorage.getItem("Events")) as string;
  return token;
};

export const QueryAddEvent = async (
  name: string,
  start: string,
  end: string,
  projectID: string,
  notion: Client | undefined,
) => {
  const idDB = await getID();
  await notion?.pages
    .create(addEventJson(name, start, end, projectID, idDB) as CreatePageParameters)
    .catch((e: APIResponseError) => {
      return showToast({ title: getAPIError(e.code as string, "Event") });
    });
  return true;
};

export const QueryChangeDateEvent = async (id: string, start: string, end: string, notion: Client | undefined) => {
  await notion?.pages.update(changeDateJson(id, start, end) as UpdatePageParameters).catch((e: APIResponseError) => {
    return showToast({ title: getAPIError(e.code as string, "Event") });
  });
  return true;
};

const addEventJson = (name: string, start: string, end: string, projectID: string, token: string | undefined) => {
  return {
    icon: {
      type: "emoji",
      emoji: "🤝",
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
    },
  };
};

const changeDateJson = (id: string, start: string, end: string) => {
  return {
    page_id: id,
    properties: {
      Date: {
        date: {
          start: start,
          end: end,
        },
      },
    },
  };
};
