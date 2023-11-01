import pscale from "@api/pscale";
import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues();

pscale.auth(preferences.serviceToken);

export { pscale };
