import { getPreferenceValues } from "@raycast/api";
import { EventType } from "./external-code/interfaces";
import { MusicAssistantApi } from "./external-code/music-assistant-api";
import "./polyfills";
import { Prefs } from "./preferences";

export default function executeApiCommand<T>(command: (api: MusicAssistantApi) => Promise<T>) {
  const { host } = getPreferenceValues<Prefs>();
  const api = new MusicAssistantApi();
  return new Promise<T>((res, rej) => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    api.subscribe_multi([EventType.CONNECTED, EventType.Error], async (eventData: any) => {
      try {
        if (eventData.event === EventType.Error) {
          rej(eventData.data);
        } else {
          const result = await command(api);
          res(result);
        }
      } catch (error: any) {
        /* eslint-enable @typescript-eslint/no-explicit-any */
        rej(error);
      } finally {
        api.close();
      }
    });
    try {
      api.initialize(host);
    } catch (error) {
      rej(error);
    }
  });
}
