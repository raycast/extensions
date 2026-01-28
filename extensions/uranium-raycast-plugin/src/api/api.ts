import { combineRouters } from "./apiClient";
import { contractsApiRouter } from "./contracts";
import { assetsApiRouter } from "./assets";
import { accountApiRouter } from "./account";

export const api = combineRouters({
  account: accountApiRouter,
  contracts: contractsApiRouter,
  assets: assetsApiRouter,
});
