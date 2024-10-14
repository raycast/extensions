import { APIResponseError, Client } from "@notionhq/client";
import { CreatePageParameters } from "@notionhq/client/build/src/api-endpoints";
import { LocalStorage, showToast } from "@raycast/api";
import { getAPIError } from "../tools/generalTools";

const getToken = async () => {
  const token = (await LocalStorage.getItem("journal")) as string;
  return token;
};

export const QueryAddLink = async (
  name: string,
  projectID: string,
  url: string,
  app: string,
  icon: string,
  notion: Client | undefined,
) => {
  const idDB = await getToken();
  await notion?.pages
    .create(addLinkJson(name, projectID, url, app, icon, idDB) as CreatePageParameters)
    .catch((e: APIResponseError) => {
      return showToast({ title: getAPIError(e.code as string, "Link") });
    });
  return true;
};

const addLinkJson = (
  name: string,
  projectID: string,
  link: string,
  app: string,
  icon: string,
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
              content: name,
            },
          },
        ],
      },
      Projects: {
        relation: [
          {
            id: projectID,
          },
        ],
      },
      Link: {
        url: link,
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
      App: {
        rich_text: [
          {
            text: {
              content: app,
            },
          },
        ],
      },
    },
  };
};
