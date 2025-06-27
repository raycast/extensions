import { EventType } from "./interfaces";
import { MusicAssistantApi } from "./music-assistant-api";

import WS from "isomorphic-ws"; // polyfill for isomorphic ws
globalThis.WebSocket = globalThis.WebSocket || WS; // set global WebSocket to the polyfill

export default function executeApiCommand<T>(host: string, command: (api: MusicAssistantApi) => Promise<T>) {
  const api = new MusicAssistantApi();

  return new Promise<T>((res, rej) => {
    api.subscribe(EventType.CONNECTED, async () => {
      try {
        const result = await command(api);
        res(result);
      } catch (error) {
        rej(error);
      } finally {
        api.close();
      }
    });
    return api.initialize(host);
  });
}
