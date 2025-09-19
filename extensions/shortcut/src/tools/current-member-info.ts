import { MemberInfo } from "@useshortcut/client";
import shortcut from "../utils/shortcut";

const tool = (): Promise<MemberInfo> => shortcut.getCurrentMemberInfo().then((response) => response.data);

export default tool;
