import { Icon, showToast, closeMainWindow, showHUD, Toast, getPreferenceValues, Action } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import Bookmark from "../dtos/bookmark-dto";
import GitfoxPreferences from "../interfaces/gitfox-preferences";
import { JSX } from "react";

const execp = promisify(exec);

type OpenBookMarkActionProps = {
  bookmark: Bookmark;
  onOpen?: () => void;
};

const OpenBookmarkAction = ({ bookmark, onOpen, ...props }: OpenBookMarkActionProps): JSX.Element => (
  <Action
    {...props}
    icon={Icon.Link}
    title="Open in Gitfox"
    onAction={async () => {
      try {
        const prefs = getPreferenceValues<GitfoxPreferences>();
        await execp(`${prefs.gitfoxCliPath} ${bookmark.getFolder}`);
        onOpen?.();
        closeMainWindow({ clearRootSearch: true });
        showHUD(`Opening ${bookmark.name} in Gitfox`);
      } catch {
        showToast(Toast.Style.Failure, `Error!`, `There was a error opening: ${bookmark.folder}`);
      }
    }}
  />
);

export default OpenBookmarkAction;
