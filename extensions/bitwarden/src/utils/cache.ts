import { Cache as RaycastCache, environment } from "@raycast/api";

export const Cache = new RaycastCache({ namespace: environment.commandName });
