import { List, ActionPanel, Action, Icon, closeMainWindow, PopToRootType, Detail, open } from "@raycast/api";
import { useFrecencySorting } from "@raycast/utils";
import execPromise from "./utils/execPromise";
import { useState, useEffect, useMemo } from "react";
import { useDefbro } from "./hooks/useDefbro";
import { DEFBRO_URL, notInstalledMarkdown } from "./constants";
import { getBrowsers } from "./utils/getBrowsers";
import { Browser } from "./types";

export default function BrowserList() {
  const [searchText, setSearchText] = useState("");
  const [browsers, setBrowsers] = useState<Browser[]>([]);
  const { data: sortedBrowsers, visitItem } = useFrecencySorting(browsers);
  const [isLoading, setIsLoading] = useState(true);
  const { isInstalled, defbroPath } = useDefbro();

  useEffect(() => {
    const fetchData = async () => {
      const browserData = await getBrowsers(defbroPath!);
      setBrowsers(browserData);
      setIsLoading(false);
    };

    if (defbroPath) {
      fetchData();
    } else if (isInstalled === false) {
      setIsLoading(false);
    }
  }, [defbroPath, isInstalled]);

  const filteredBrowsers = useMemo(() => {
    return sortedBrowsers.filter((browser: Browser) => browser.title.toLowerCase().includes(searchText.toLowerCase()));
  }, [sortedBrowsers, searchText]);

  if (isInstalled === false) {
    return (
      <Detail
        markdown={notInstalledMarkdown}
        actions={
          <ActionPanel>
            <Action title="Install Defbro" onAction={() => open(DEFBRO_URL)} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Browser"
      navigationTitle="Search Browser"
      isLoading={isLoading}
    >
      {filteredBrowsers.map((browser: Browser) => (
        <List.Item
          key={browser.id}
          title={browser.title}
          icon={browser.default ? Icon.CheckCircle : Icon.Circle}
          actions={
            <ActionPanel>
              <Action
                title="Set as Default"
                onAction={async () => {
                  if (!defbroPath) {
                    throw new Error("defbro executable not found");
                  }
                  await execPromise(`${defbroPath} ${browser.id}`);
                  visitItem(browser);
                  await closeMainWindow({ popToRootType: PopToRootType.Immediate, clearRootSearch: true });
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
