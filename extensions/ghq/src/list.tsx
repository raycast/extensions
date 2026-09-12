import { useCallback, useEffect, useState } from "react";
import { Action, ActionPanel, List, getPreferenceValues, closeMainWindow, clearSearchBar, Icon } from "@raycast/api";
import { fetchGHQList } from "./ghq";
import { lanuchEditor } from "./editor";
import { Fzf } from "fzf";
import { showFailureToast } from "@raycast/utils";

async function cleanup() {
  await clearSearchBar();
  await closeMainWindow({ clearRootSearch: true });
}

function getPreference() {
  const preferences = getPreferenceValues<{
    GHQ_ROOT_PATH: string;
    EDITOR: { bundleId: string; name: string; path: string };
  }>();
  console.log(preferences);
  let rootPath = preferences.GHQ_ROOT_PATH.trim();
  const editor = preferences.EDITOR.path;

  // replace ~ with the actual home directory
  if (rootPath.startsWith("~")) {
    rootPath = rootPath.replace("~", String(process.env.HOME));
  }

  return {
    rootPath,
    editor,
  };
}

export default function Command() {
  const { rootPath, editor } = getPreference();
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

  const handleOpenEditor = useCallback(
    async (index: number) => {
      const projectPath = `${rootPath}/${paths[index]}`;

      try {
        await lanuchEditor(editor, projectPath);
        await cleanup();
      } catch (e) {
        await showFailureToast(e, { title: "Can not open Editor" });
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
              <Action icon={Icon.Code} title="Editor" onAction={() => handleOpenEditor(index)} />
              <Action.OpenWith title="Open Other App" path={`${rootPath}/${paths[index]}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
