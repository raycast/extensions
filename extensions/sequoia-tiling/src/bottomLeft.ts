import { getPreferenceValues } from "@raycast/api";
import { makeCommand } from "./_factory";
import { SubMenuType } from "./constants";

export default () => makeCommand(getPreferenceValues<Preferences.Command>().menuName, SubMenuType.MoveResize)();
