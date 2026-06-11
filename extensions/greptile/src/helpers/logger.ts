import { environment } from "@raycast/api";

function debug(message: string, metadata?: unknown) {
  if (!environment.isDevelopment) {
    return;
  }

  if (metadata === undefined) {
    console.debug(message);
    return;
  }

  console.debug(message, metadata);
}

export const logger = {
  debug,
};
