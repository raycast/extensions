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
        const isSelected = browsers.includes(browser.path);

        return (
          <List.Item
            key={browser.path}
            icon={isSelected ? { source: Icon.CheckCircle, tintColor: Color.Green } : Icon.Circle}
            title={browser.name}
            actions={
              <ActionPanel>
                <Action
                  title={isSelected ? `Disable ${browser.name}` : `Enable ${browser.name}`}
                  icon={isSelected ? Icon.Circle : { source: Icon.CheckCircle, tintColor: Color.Green }}
                  onAction={() => {
                    let newBrowsers: string[];
                    if (isSelected) {
                      newBrowsers = browsers.filter((bPath) => bPath !== browser.path);
                    } else {
                      newBrowsers = [...browsers, browser.path];
                    }
                    setBrowsers(newBrowsers);
                    onSelect(newBrowsers);
                  }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
