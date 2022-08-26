import { Action } from "@raycast/api";
import { useCallback } from "react";
import { runAppleScript } from "run-applescript";
interface SelectFileProps extends Omit<Action.Props, "onAction"> {
  prompt?: string;
  type?: string;
  onSelect(filePath: string | null): unknown;
}

export const SelectFolder = ({ onSelect, prompt = "Please select a file", type, ...props }: SelectFileProps) => {
  const handleSelectFromFinder = useCallback(async () => {
    try {
      const path = await runAppleScript(`
        set chosenFile to choose folder with prompt "${prompt}:"${type != null ? `of type {"${type}"}` : ""}
        set raycastPath to POSIX path of (path to application "Raycast")
        do shell script "open " & raycastPath
        return POSIX path of chosenFile
      `);
      if (path) {
        onSelect(path);
      } else {
        onSelect(null);
      }
    } catch (e) {
      onSelect(null);
    }
  }, []);

  return <Action {...props} onAction={handleSelectFromFinder} />;
};
