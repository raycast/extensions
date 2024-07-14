import { Cache } from "@raycast/api";

const cache = new Cache();

type LastCommand = {
  text: string;
  processId: string;
};

const LAST_COMMAND_KEY = "last-command";

export const getLastCommand = () => {
  const cached = cache.get(LAST_COMMAND_KEY);

  if (!cached) {
    return null;
  }

  return JSON.parse(cached) as LastCommand;
};

export const setLastCommand = (command: LastCommand) => {
  cache.set(LAST_COMMAND_KEY, JSON.stringify(command));
};
