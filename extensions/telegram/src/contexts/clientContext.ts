import { createContext } from "react";
import { TelegramClient } from "telegram";

export const ClientContext = createContext<{
  setGlobalClient: (client?: TelegramClient) => void;
  globalClient?: TelegramClient;
}>({
  setGlobalClient: () => undefined,
  globalClient: undefined,
});
