import { SynciClient } from "./api-client";
import { session } from "./auth";
export const api = new SynciClient(() => session.accessToken());
