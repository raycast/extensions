import { createClient } from "@youri-kane/heroku-client";
import { CustomResponse } from "@youri-kane/heroku-client/dist/requests/types";
import getPreferences from "./preferences";

export default createClient({
  token: getPreferences().apiKey,
});

export function simplifyCustomResponse<T>(res: CustomResponse<T>): T {
  if (res.hasFailed) {
    throw res.error;
  } else {
    return res.data;
  }
}
