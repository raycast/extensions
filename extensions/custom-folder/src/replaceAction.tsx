import { Action, popToRoot } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { FC, useEffect, useState } from "react";
import { replaceIconScript } from "./utils/replaceIconScript";

interface ReplaceActionProps {
  iconPath: string;
  targetFolderPath: string;
  onAction: () => Promise<void>;
}

export const ReplaceAction: FC<ReplaceActionProps> = ({ iconPath, targetFolderPath, onAction }) => {
  const [shouldExec, setShouldExec] = useState<boolean>(false);
  const scriptContent = replaceIconScript(iconPath, targetFolderPath);

  const { error } = useExec(`${scriptContent}`, {
    shell: true,
    execute: shouldExec || false,
    failureToastOptions: {
      title: "Failed to apply icon",
      message: "Please try again, or save the icon and apply manually.",
    },
    onData: () => popToRoot(),
  });

  useEffect(() => {
    // console.error("error: ", error);
  }, [error]);

  return (
    <Action
      title={"Apply to Folder"}
      icon={"switch-16"}
      onAction={() => {
        onAction().then(() => {
          setShouldExec(true);
        });
      }}
    />
  );
};
