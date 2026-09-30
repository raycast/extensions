import { Action, popToRoot } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { runExecutable } from "../../lib/utils";

export function OpenInWordAction({ filename, executable }: { filename: string; executable: string | undefined }) {
  if (!executable) {
    return null;
  }
  const onOpen = () => {
    try {
      runExecutable(executable, [filename]);
      popToRoot();
    } catch (error) {
      showFailureToast(error);
    }
  };
  return <Action title="Open in Word" icon={"word.svg"} onAction={onOpen} />;
}
