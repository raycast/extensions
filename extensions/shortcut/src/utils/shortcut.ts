import { ShortcutClient } from "@useshortcut/client";
import { getPreferenceValues } from "./preference";

const preference = getPreferenceValues();
export default new ShortcutClient(preference.apiToken);
