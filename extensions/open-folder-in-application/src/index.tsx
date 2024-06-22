import { ActionPanel, Action, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import * as path from "path";
import * as os from "os";
import { getFolders } from "@functions/getFolders";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [folders, setFolders] = useState<string[]>([]);

  const excludedFolders = ["node_modules", "dist"];

  const excludedSystemFolders = [path.resolve(os.homedir(), "Library"), path.resolve(os.homedir(), "Pictures")];

  useEffect(() => {
    if (searchText) {
      const searchFolders = async () => {
        try {
          const baseDir = path.resolve(os.homedir());

          const allFolders = await getFolders(baseDir, excludedFolders, excludedSystemFolders);

          const filteredFolders = allFolders.filter((folder) =>
            folder.toLowerCase().includes(searchText.toLowerCase()),
          );

          filteredFolders.sort((a, b) => {
            const depthA = a.split(path.sep).length;
            const depthB = b.split(path.sep).length;
            return depthA - depthB;
          });

          setFolders(filteredFolders.slice(0, 20));
        } catch (error) {
          showToast({
            style: Toast.Style.Failure,
            title: "Error",
            message: String(error),
          });
        }
      };

      searchFolders();
    }
  }, [searchText]);

  return (
    <List searchBarPlaceholder="Type to search for folders..." onSearchTextChange={setSearchText}>
      {folders.map((folder) => (
        <List.Item
          key={`${folder}`}
          title={folder}
          actions={
            <ActionPanel>
              <Action.OpenWith path={folder} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
