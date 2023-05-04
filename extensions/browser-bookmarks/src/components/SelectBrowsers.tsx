import { ActionPanel, Action, Icon, List, Color } from "@raycast/api";
import { useState } from "react";

import useAvailableBrowsers from "../hooks/useAvailableBrowsers";

type SelectBrowsersProps = {
  browsers: string[];
  onSelect: (browsers: string[]) => void;
};

export default function SelectBrowsers({ browsers: initialBrowsers, onSelect }: SelectBrowsersProps) {
  const { data, isLoading } = useAvailableBrowsers();

  const [browsers, setBrowsers] = useState(initialBrowsers);

  return (
    <List isLoading={isLoading}>
      {data?.map((browser) => {
        const isSelected = browsers.includes(browser.bundleId as string);

        return (
          <List.Item
            key={browser.bundleId}
            icon={isSelected ? { source: Icon.CheckCircle, tintColor: Color.Green } : Icon.Circle}
            title={browser.name}
            actions={
              <ActionPanel>
                {isSelected ? (
                  <Action
                    title={`Disable ${browser.name}`}
                    icon={Icon.Circle}
                    onAction={() => {
                      const newBrowsers = browsers.filter((b) => b !== browser.bundleId);
                      setBrowsers(newBrowsers);
                      onSelect(newBrowsers);
                    }}
                  />
                ) : (
                  <Action
                    title={`Enable ${browser.name}`}
                    icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
                    onAction={() => {
                      const newBrowsers = [...browsers, browser.bundleId as string];
                      setBrowsers(newBrowsers);
                      onSelect(newBrowsers);
                    }}
                  />
                )}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
