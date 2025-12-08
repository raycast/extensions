import { Action, ActionPanel, Icon, List, closeMainWindow, popToRoot } from "@raycast/api";
import { useEffect, useState } from "react";
import { getBrowsers, setDefaultBrowser } from "./lib/launch-services";
import { showFailureToast } from "@raycast/utils";

type BrowserListItem = {
  bundleId: string;
  name: string;
  path?: string;
};

export default function Command() {
  const [browsers, setBrowsers] = useState<BrowserListItem[]>([]);
  const [defaultBrowser, setDefault] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await getBrowsers();
        setDefault(data.defaultBrowser);
        setBrowsers(data.browsers.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (error) {
        await showFailureToast(error, { title: "Failed to load browsers" });
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const handleSelect = async (bundleId: string) => {
    try {
      await setDefaultBrowser(bundleId);
      // Exit the view immediately; user will handle system prompt.
      await popToRoot({ clearSearchBar: true });
      await closeMainWindow();
      return;
    } catch (error) {
      await showFailureToast(error, { title: "Failed to set default browser" });
    }
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search browsers…">
      {defaultBrowser ? (
        <List.Section title="Default">
          {browsers
            .filter((browser) => browser.bundleId === defaultBrowser)
            .map((browser) => (
              <List.Item
                key={browser.bundleId}
                icon={browser.path ? { fileIcon: browser.path } : Icon.CheckCircle}
                title={browser.name}
                subtitle={browser.bundleId}
                accessories={[{ tag: { value: "Default", color: "green" } }]}
              />
            ))}
        </List.Section>
      ) : null}

      <List.Section title="Available Browsers">
        {browsers
          .filter((browser) => browser.bundleId !== defaultBrowser)
          .map((browser) => (
            <List.Item
              key={browser.bundleId}
              icon={browser.path ? { fileIcon: browser.path } : Icon.Globe}
              title={browser.name}
              subtitle={browser.bundleId}
              actions={
                <ActionPanel>
                  <Action
                    title="Set as Default"
                    icon={Icon.CheckCircle}
                    onAction={() => handleSelect(browser.bundleId)}
                  />
                </ActionPanel>
              }
            />
          ))}
      </List.Section>
    </List>
  );
}
