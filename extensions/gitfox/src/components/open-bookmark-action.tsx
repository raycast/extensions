import { Icon, showToast, closeMainWindow, showHUD, Toast, getPreferenceValues, Action } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import Bookmark from "../dtos/bookmark-dto";
import GitfoxPreferences from "../interfaces/gitfox-preferences";

const execp = promisify(exec);

type OpenBookMarkActionProps = {
  bookmark: Bookmark;
};

const OpenBookmarkAction = ({ bookmark, ...props }: OpenBookMarkActionProps): JSX.Element => (
  <Action
    {...props}
    icon={Icon.Link}
    title="Open in Gitfox"
    onAction={async () => {
      try {
        const prefs = getPreferenceValues<GitfoxPreferences>();
        await execp(`${prefs.gitfoxCliPath} ${bookmark.getFolder}`);
      } catch (e) {
        showToast(Toast.Style.Failure, `Error!`, `There was a error opening: ${bookmark.folder}`);
      } finally {
        closeMainWindow({ clearRootSearch: true });
        showHUD(`Opening ${bookmark.name} in Gitfox`);
      }
    }}
  />
);

export default OpenBookmarkAction;
