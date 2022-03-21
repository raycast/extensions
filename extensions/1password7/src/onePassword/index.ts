import { getPreferenceValues } from "@raycast/api";
import { AppVersion, OnePassword, Preferences } from "./types";
import onepassword7 from "./onePassword7";
import onepassword8 from "./onePassword8";
import { existsSync } from "fs";
import { homedir } from "os";

const CACHES_PATH = `${homedir()}/Library/Containers/com.agilebits.onepassword7/Data/Library/Caches/Metadata/1Password`;

const preferences = getPreferenceValues<Preferences>();

let onePassword: OnePassword;
switch (preferences.appVersion) {
  case AppVersion.Automatic:
    if (existsSync(CACHES_PATH)) {
      onePassword = onepassword7;
    } else {
      onePassword = onepassword8;
    }
    break;
  case AppVersion.V8:
    onePassword = onepassword8;
    break;
  case AppVersion.V7:
    onePassword = onepassword7;
    break;
}

export default onePassword;
