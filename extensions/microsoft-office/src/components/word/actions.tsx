import { Action, popToRoot } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { spawn } from "child_process";

export function OpenInWordAction({ filename, executable }: { filename: string; executable: string | undefined }) {
  if (!executable) {
    return null;
  }
  const onOpen = () => {
    try {
      const args = [filename];
      const child = spawn(executable, args, {
        detached: true,
        stdio: "ignore",
        windowsHide: false,
      });
      child.unref();
      popToRoot();
    } catch (error) {
      showFailureToast(error);
    }
  };
  return <Action title="Open in Word" icon={"word.svg"} onAction={onOpen} />;
}
