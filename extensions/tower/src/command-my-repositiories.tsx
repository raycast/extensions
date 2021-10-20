import {
  ActionPanel,
  closeMainWindow,
  Detail,
  Icon,
  List,
  preferences,
  render,
  showHUD,
  showToast,
  ToastStyle,
} from "@raycast/api";
import { exec } from "child_process";
import fs from "fs";
import os from "os";
import plist from "plist";
import tildify from "tildify";
import { promisify } from "util";
import Bookmark from "./dtos/Bookmark.dto";
import ImportedTowerBookmarks, { ImportedTowerBookmark } from "./interfaces/imported-tower-bookmark";

const execp = promisify(exec);
const towerBookmarksPlistLocation = `${os.homedir()}/Library/Application\ Support/com.fournova.Tower3/bookmarks-v2.plist`;

async function main() {
  if (isTowerCliInstalled()) {
    const bookmarks = await fetchBookmarks();
    render(<BookmarkList bookmarks={bookmarks} />);
  } else {
    render(<Detail navigationTitle="Tower CLI not installed" markdown={towerCliRequiredMessage()}></Detail>);
  }
}

main();

async function fetchBookmarks(): Promise<Bookmark[]> {
  try {
    const bookmarksFile = towerBookmarksPlistLocation;
    const obj = plist.parse(fs.readFileSync(bookmarksFile, "utf8")) as unknown as ImportedTowerBookmarks;

    if (obj.children.length === 0) {
      await showToast(ToastStyle.Failure, "No Bookmarks found", "Now is the time to start bookmarking!");

      return Promise.resolve([]);
    }

    const bookmarks = obj.children
      .map((bookmark: ImportedTowerBookmark) => {
        return new Bookmark(
          tildify(bookmark.fileURL.replace("file:/", "")),
          bookmark.name,
          bookmark.lastOpenedDate,
          bookmark.repositoryIdentifier
        );
      })
      .sort(function (a: Bookmark, b: Bookmark) {
        return ("" + b.LastOpenedDate).localeCompare("" + a.LastOpenedDate);
      });

    return Promise.resolve(bookmarks);
  } catch (error) {
    await showToast(ToastStyle.Failure, "Something whent wrong", "Something whent wrong loading the Tower bookmarks.");
    return Promise.resolve([]);
  }
}

function BookmarkList(props: { bookmarks: Bookmark[] }) {
  return (
    <List searchBarPlaceholder="Filter bookmarks by name...">
      {props.bookmarks.map((bookmark) => (
        <BookmarkListItem key={bookmark.RepositoryIdentifier} bookmark={bookmark} />
      ))}
    </List>
  );
}

function BookmarkListItem(props: { bookmark: Bookmark }) {
  const bookmark: Bookmark = props.bookmark;

  return (
    <List.Item
      id={bookmark.RepositoryIdentifier}
      title={bookmark.Name}
      subtitle={bookmark.Folder}
      icon={Icon.Circle}
      accessoryTitle={"Repository"}
      actions={
        <ActionPanel>
          <OpenBookMarkAction bookmark={bookmark} />
        </ActionPanel>
      }
    />
  );
}

type OpenBookMarkActionProps = {
  bookmark: Bookmark;
};

export const OpenBookMarkAction = ({ bookmark, ...props }: OpenBookMarkActionProps): JSX.Element => (
  <ActionPanel.Item
    {...props}
    icon={Icon.Link}
    title="Open repository"
    onAction={async () => {
      console.log(bookmark);

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

function isTowerCliInstalled(): boolean {
  try {
    const towerCliPath = preferences.towerCliPath.value as string;
    if (fs.existsSync(towerCliPath)) return true;

    return false;
  } catch (e) {
    return false;
  }
}

function towerCliRequiredMessage(): string {
  return `
# Tower CLI not installed

Please enable the Tower Command Line Utility in the Tower app Settings > Intergration > Tower Command Line Utility
You can find more information over [here](https://www.git-tower.com/help/guides/integration/cli-tool/mac).
    `;
}
