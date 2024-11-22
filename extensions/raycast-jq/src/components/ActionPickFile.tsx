// Credits to Federico Zivolo <https://github.com/FezVrasta/raycast-toolkit>

import { Action } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { ComponentProps, useCallback } from "react";

interface SelectFileProps extends Omit<ComponentProps<typeof Action>, "onAction"> {
  prompt?: string;
  type?: string;
  onSelect(filePath: string | null): unknown;
}

export const ActionPickFile = ({
  onSelect,
  prompt = "Please select a file",
  type,
  ...props
}: SelectFileProps): JSX.Element => {
  const handleSelectFromFinder = useCallback(async () => {
    try {
      const path = await runAppleScript(
        `
        set chosenFile to choose file with prompt "${prompt}:"${type != null ? `of type {"${type}"}` : ""}
        set raycastPath to POSIX path of (path to application "Raycast")
        do shell script "open " & raycastPath
        return POSIX path of chosenFile
      `,
        { timeout: 0 },
      );
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
