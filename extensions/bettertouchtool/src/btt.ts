import { getPreferenceValues } from "@raycast/api";
import { Btt } from "bettertouchtool";

export function createBttClient() {
  const preferences = getPreferenceValues<Preferences>();
  const port = Number(preferences.bttWebserverPort);
  const webserverPort = Number.isInteger(port) && port > 0 && port <= 65535 ? port : 64472;

  return new Btt({
    sharedSecret: preferences.bttSharedSecret || undefined,
    http: { port: webserverPort },
  });
}
