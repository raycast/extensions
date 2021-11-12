import { ActionPanel, Icon, preferences, showToast, ToastStyle, closeMainWindow, showHUD } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import Bookmark from "../dtos/bookmark-dto";
const execp = promisify(exec);

type OpenBookMarkActionProps = {
  bookmark: Bookmark;
};

const OpenBookMarkAction = ({ bookmark, ...props }: OpenBookMarkActionProps): JSX.Element => (
  <ActionPanel.Item
    {...props}
    icon={Icon.Link}
    title="Open in Tower"
    onAction={async () => {
      try {
        const towerCliPath = preferences.towerCliPath.value as string;
        await execp(`${towerCliPath} ${bookmark.Folder}`);
      } catch (e) {
        showToast(ToastStyle.Failure, `Error!`, `There was a error opening: ${bookmark.Folder}`);
      } finally {
        closeMainWindow({ clearRootSearch: true });
        showHUD(`Opening ${bookmark.Name} in Tower`);
      }
    }}
  />
);

export default OpenBookMarkAction;
