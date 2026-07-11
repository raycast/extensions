import { initClient, tsRestFetchApi } from "@ts-rest/core";
import { contract } from "./contract";
import { preferences } from "../helpers/preferences";
import "../helpers/fetch-polyfill";
import { environment } from "@raycast/api";
import { fakeMainAccountTransactions, fakeMemberships, fakeOrganization } from "../helpers/fake-data";

const baseUrl = "https://thirdparty.qonto.com/v2";

/** Client API */
export const client = initClient(contract, {
  baseUrl,
  baseHeaders: {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `${preferences.login}:${preferences.secretKey}`,
  },
  jsonQuery: true,
  api: async (args) => {
    if (environment.isDevelopment) {
      console.log(args);
    }

    if (preferences.demo) {
      return new Promise((resolve) => {
        if (args.path.startsWith(`${baseUrl}/organization`)) {
          resolve({ status: 200, body: fakeOrganization });
        }
        if (args.path.startsWith(`${baseUrl}/memberships`)) {
          resolve({ status: 200, body: fakeMemberships });
        }
        if (args.path.startsWith(`${baseUrl}/transactions`)) {
          resolve({ status: 200, body: fakeMainAccountTransactions });
        }
      });
    }

    return tsRestFetchApi(args);
  },
});
