import { Detail } from "@raycast/api";
import { YASB } from "./executor";

export default function Version() {
  try {
    const output = YASB.executeCommand(YASB.VERSION_COMMAND);

    return <Detail markdown={`# YASB Version\n\n${output}`} />;
  } catch (error) {
    console.error("Error getting YASB version:", error);
    return;
  }
}
