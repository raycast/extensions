import { Group } from "@useshortcut/client";
import shortcut from "../utils/shortcut";

const tool = (): Promise<Group[]> => shortcut.listGroups().then((response) => response.data);

export default tool;
