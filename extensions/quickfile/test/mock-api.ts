import { fetch as _fetch } from "node-fetch-native";
import { baseURL } from "../src/api";

// eslint-disable-next-line
// @ts-ignore
globalThis.fetch = async (url: string, opts: any) => {
  let response: Record<string, any> = {};
  switch (url) {
    case `${baseURL}/bank/search`:
      response = await import("./bank/search").then((r) => r.default());
      break;
    case `${baseURL}/bank/getaccounts`:
      response = await import("./bank/getaccounts").then((r) => r.default);
      break;
    case `${baseURL}/bank/getaccountbalances`:
      response = await import("./bank/getaccountbalances").then((r) => r.default);
      break;
    case `${baseURL}/system/getaccountdetails`:
      response = await import("./system/getaccountdetails.json").then((r) => r.default);
      break;
    default:
      return _fetch(url, opts);
  }
  return {
    headers: { get: () => "application/json" },
    text: () => Promise.resolve(JSON.stringify(response)),
    json: () => Promise.resolve(response),
    ok: true,
  };
};
