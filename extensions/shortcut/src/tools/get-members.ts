import { Member } from "@useshortcut/client";
import shortcut from "../utils/shortcut";

const tool = (): Promise<Member[]> => shortcut.listMembers({}).then((response) => response.data);

export default tool;
