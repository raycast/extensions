import { Action, Icon } from "@raycast/api";
import { useContext } from "react";
import { AppContext } from "./AppContext";
import { getParentFolder } from "./folders";

interface ActionsGoDirectoryPairProps {
  currentFolderPath: string;
  // When a currently selected item is a file, `subDirectoryPath` is passed as `null`,
  subDirectoryPath: string | null;
}

/**
 * The function returns a pair of actions used to:
 * - `Go to parent directory` - `Cmd + Shift + <-`
 * - `Go to Sub Directory ` - `Cmd + Shift + ->`
 *
 * These actions will not push the new view into the stack, so next time users trigger the File Manager extensions,
 * users do not need to press Esc many times to go to the root.
 * If these actions push the new view into the stack, I believe, most of the time, users will lose their minds and be confused after navigating too many folders.
 *
 * When the currently selected item is a file, `subDirectoryPath` is passed as `null`,
 * `Go to sub directory` action does not show,
 * Only `Go to Sub Directory` shows.
 *
 */
export function ActionsGoDirectoryPair(props: ActionsGoDirectoryPairProps) {
  const { currentFolderPath, subDirectoryPath } = props;
  const { renderDirectory } = useContext(AppContext);

  return (
    <>
      {subDirectoryPath ? (
        <Action
          title="Go to Sub Directory"
          icon={Icon.ArrowRight}
          onAction={() => {
            renderDirectory(subDirectoryPath);
          }}
          shortcut={{
            modifiers: ["cmd", "shift"],
            key: "arrowRight",
          }}
        />
      ) : null}
      <Action
        title="Go to Parent Directory"
        icon={Icon.ArrowLeft}
        onAction={() => {
          const newPath = getParentFolder(currentFolderPath);
          renderDirectory(newPath);
        }}
        shortcut={{
          modifiers: ["cmd", "shift"],
          key: "arrowLeft",
        }}
      />
    </>
  );
}
