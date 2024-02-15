import { useCallback, useEffect, useState } from "react";
import { Action, ActionPanel, List, getPreferenceValues, closeMainWindow, clearSearchBar } from "@raycast/api";
import { fetchGHQList } from "./ghq";
import { launchVSCode } from "./vscode";
import { Fzf } from "fzf";
import { showFailureToast } from "@raycast/utils";

async function cleanup() {
  await clearSearchBar();
  await closeMainWindow({ clearRootSearch: true });
}

function getGHQRootPath() {
  const preferences = getPreferenceValues<{ GHQ_ROOT_PATH: string }>();
  const root = preferences.GHQ_ROOT_PATH.trim();

  // replace ~ with the actual home directory
  if (root.startsWith("~")) {
    return root.replace("~", String(process.env.HOME));
  }

  return root;
}

export default function Command() {
  const rootPath = getGHQRootPath();
  const [paths, setPaths] = useState<string[]>([]);
  const [result, setResult] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const fzf = new Fzf(result);

  const handleSearchTextChange = useCallback(
    (text: string) => {
      // fuzzy search
      const paths = fzf.find(text);
      setPaths(paths.map((p) => p.item));
    },
    [paths],
  );

  const handleOpenVSCode = useCallback(
    async (index: number) => {
      const projectPath = `${rootPath}/${paths[index]}`;

      try {
        await launchVSCode(projectPath);
        await cleanup();
      } catch (e) {
        await showFailureToast(e, { title: "Can not open VSCode" });
      }
    },
    [paths],
  );

  useEffect(() => {
    fetchGHQList(rootPath).then((ghqList) => {
      setPaths(ghqList);
      setResult(ghqList);
      setIsLoading(false);
    });
  }, []);

  return (
    <List isLoading={isLoading} onSearchTextChange={handleSearchTextChange}>
      {paths.map((path, index) => (
        <List.Item
          key={path}
          title={path}
          actions={
            <ActionPanel>
              <Action icon="vscode.png" title="Open VSCode" onAction={() => handleOpenVSCode(index)} />
              <Action.OpenWith title="Open Other App" path={`${rootPath}/${paths[index]}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
