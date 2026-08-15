import { Detail } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { YASB } from "./executor";

export default function Version() {
  const {
    data: output,
    isLoading,
    error,
  } = useExec(YASB.VERSION_COMMAND.split(" ")[0], YASB.VERSION_COMMAND.split(" ").slice(1));

  if (error) {
    return <Detail markdown={`# Error\n\nFailed to get YASB version: ${error.message}`} />;
  }

  return <Detail isLoading={isLoading} markdown={`# YASB Version\n\n${output || ""}`} />;
}
