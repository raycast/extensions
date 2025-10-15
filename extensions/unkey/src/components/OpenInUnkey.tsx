import { Action, Keyboard } from "@raycast/api";
import { APP_URL } from "../utils/constants";

export default function OpenInUnkey({route}:{route:string}) {
return <Action.OpenInBrowser
                    shortcut={Keyboard.Shortcut.Common.Open}
                    url={APP_URL + route}
                  />
}