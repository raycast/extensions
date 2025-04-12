import shortcut from "../utils/shortcut";
import { EpicSlim } from "@useshortcut/client";

const tool = (): Promise<EpicSlim[]> => shortcut.listEpics({}).then((response) => response.data);

export default tool;
