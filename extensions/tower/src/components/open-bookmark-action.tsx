import { Action, getPreferenceValues, Icon, showHUD, showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import Bookmark from "../dtos/bookmark-dto";
import TowerPreferences from "../interfaces/tower-preferences";

type OpenBookMarkActionProps = {
  bookmark: Bookmark;
};

const OpenBookMarkAction = ({ bookmark, ...props }: OpenBookMarkActionProps): JSX.Element => (
  <Action
    {...props}
    icon={Icon.Link}
    title="Open in Tower"
    onAction={() => {
      const towerCliPath = getPreferenceValues<TowerPreferences>().towerCliPath;

      exec(`${towerCliPath} '${bookmark.getPath}'`, async (error, _, stderr) => {
        if (error || stderr) {
          await showToast({
            style: Toast.Style.Failure,
            title: `There was a error opening: ${bookmark.Folder}`,
          });
        } else {
          await showHUD(`Opening ${bookmark.Name} in Tower`, { clearRootSearch: true });
        }
      });
    }}
  />
);

export default OpenBookMarkAction;
