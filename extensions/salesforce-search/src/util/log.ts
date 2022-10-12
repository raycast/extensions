import { environment } from "@raycast/api";

export const log: typeof console.log = environment.isDevelopment ? console.log : () => undefined;
