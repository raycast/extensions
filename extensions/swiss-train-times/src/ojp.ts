import { SDK } from "ojp-sdk-next";

export const ojp = new SDK(
  "raycast-extension",
  {
    authToken:
      "eyJvcmciOiI2NDA2NTFhNTIyZmEwNTAwMDEyOWJiZTEiLCJpZCI6IjUwZjhiYWU5ZjhhZjQ5ZmNhNzA2MGNkYzE0MTlhNjg2IiwiaCI6Im11cm11cjEyOCJ9",
    url: "https://api.opentransportdata.swiss/ojp20",
  },
  "en",
);
