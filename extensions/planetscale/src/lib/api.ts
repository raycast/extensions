import pscale, { ListBranchesResponse200, ListDatabasesResponse200, ListDeployRequestsResponse200 } from "@api/pscale";
import FetchError from "api/dist/core/errors/fetchError";

export function createPlanetScaleClient(accessToken: string) {
  return pscale.auth(accessToken);
}

export type PlanetScaleClient = ReturnType<typeof createPlanetScaleClient>;

export const PlanetScaleError = FetchError;

export type Database = ListDatabasesResponse200["data"][0];
export type Branch = ListBranchesResponse200["data"][0];
export type DeployRequest = ListDeployRequestsResponse200["data"][0];
