import { environment } from "@raycast/api"

export const log = environment.isDevelopment ? console.log : (message?: any, ...optionalParams: any[]) => {} // eslint-disable-line