import { List, ActionPanel, Action, Icon, closeMainWindow, PopToRootType, Detail, open } from "@raycast/api";
import execPromise from "./utils/execPromise";
import { useState, useEffect, useMemo } from "react";
import { useIsDefbroInstalled } from "./hooks/useIsDefbroInstalled";
import { DEFBRO_PATH, DEFBRO_URL, notInstalledMarkdown } from "./constants";
import { getBrowsers } from "./utils/getBrowsers";
import { Browser } from "./types";

export default function BrowserList() {
  const [searchText, setSearchText] = useState("");
  const [browsers, setBrowsers] = useState<Browser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isInstalled = useIsDefbroInstalled();

  useEffect(() => {
    const fetchData = async () => {
      const browserData = await getBrowsers();
      setBrowsers(browserData);
      setIsLoading(false);
    };

    if (isInstalled) {
      fetchData();
    }
  }, [isInstalled]);

  const filteredBrowsers = useMemo(() => {
    return browsers.filter((browser) => browser.title.toLowerCase().includes(searchText.toLowerCase()));
  }, [browsers, searchText]);

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
      {filteredBrowsers.map((browser) => (
        <List.Item
          key={browser.id}
          title={browser.title}
          icon={browser.default ? Icon.CheckCircle : Icon.Circle}
          actions={
            <ActionPanel>
              <Action
                title="Set as Default"
                onAction={async () => {
                  await execPromise(`${DEFBRO_PATH} ${browser.id}`);
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
