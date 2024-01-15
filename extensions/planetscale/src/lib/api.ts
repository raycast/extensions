import pscale from "@api/pscale";
import FetchError from "api/dist/core/errors/fetchError";

export function createPlanetScaleClient(accessToken: string) {
  return pscale.auth(accessToken);
}

export type PlanetScaleClient = ReturnType<typeof createPlanetScaleClient>;

export const PlanetScaleError = FetchError;
