import { Action, Icon, Toast, closeMainWindow, getPreferenceValues, showHUD, showToast } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import Bookmark from "../dtos/bookmark-dto";
import TowerPreferences from "../interfaces/tower-preferences";
const execp = promisify(exec);

type OpenBookMarkActionProps = {
  bookmark: Bookmark;
};

const OpenBookMarkAction = ({ bookmark, ...props }: OpenBookMarkActionProps): JSX.Element => (
  <Action
    {...props}
    icon={Icon.Link}
    title="Open in Tower"
    onAction={async () => {
      try {
        const towerCliPath = getPreferenceValues<TowerPreferences>().towerCliPath;
        await execp(`${towerCliPath} ${bookmark.getFolder}`);
      } catch (e) {
        showToast(Toast.Style.Failure, `Error!`, `There was a error opening: ${bookmark.Folder}`);
      } finally {
        closeMainWindow({ clearRootSearch: true });
        showHUD(`Opening ${bookmark.Name} in Tower`);
      }
    }}
  />
);

export default OpenBookMarkAction;
