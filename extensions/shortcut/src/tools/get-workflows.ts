import { Workflow } from "@useshortcut/client";
import shortcut from "../utils/shortcut";

const tool = (): Promise<Workflow[]> => shortcut.listWorkflows().then((response) => response.data);

export default tool;
