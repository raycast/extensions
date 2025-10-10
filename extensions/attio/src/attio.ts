import { getPreferenceValues } from "@raycast/api";
import { Attio } from "attio-js";
const {access_token} = getPreferenceValues<Preferences>()

export const attio = new Attio({
    apiKey: access_token
})