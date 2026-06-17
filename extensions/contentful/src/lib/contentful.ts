import { CONTENTFUL_ENVIRONMENT, CONTENTFUL_SPACE, CONTENTFUL_TOKEN } from "./config";

import * as contentful from "contentful-management";
export const CONTENTFUL = contentful.createClient(
  {
    accessToken: CONTENTFUL_TOKEN,
    onError(error) {
      throw new Error(error.response.data.message);
    },
  },
  {
    type: "plain",
    defaults: {
      spaceId: CONTENTFUL_SPACE,
      environmentId: CONTENTFUL_ENVIRONMENT,
    },
  },
);
