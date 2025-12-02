import { getPreferenceValues } from "@raycast/api";
import { makeCommand } from "./_factory";

export default () => makeCommand(getPreferenceValues<Preferences.Command>().menuName)();
