import { ShortcutClient } from "@useshortcut/client";
import { getPreferenceValues } from "@raycast/api";
import { Preference } from "../types";

const preference = getPreferenceValues<Preference>();

export default new ShortcutClient(preference.apiToken);
