import { Action, ActionPanel, Color, Icon, List, LocalStorage, useNavigation } from "@raycast/api";
import { ActionSettings } from "./components/action-settings";
import { useBrowserSetup } from "./hooks/useBrowserSetup";
import { useMemo } from "react";
import { CacheKey } from "./utils/constants";
import { MutatePromise } from "@raycast/utils";
import { BrowserTab } from "./types/types";

export function SetupBrowsers(props: { browserTabsMutate: MutatePromise<BrowserTab[] | undefined> }) {
  const { browserTabsMutate } = props;

  const { data, isLoading, mutate } = useBrowserSetup();
  const browserSetups = useMemo(() => {
    if (!data) return [];
    return data;
  }, [data]);
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search">
      <List.EmptyView
        icon={Icon.Compass}
        title="No Browsers"
        actions={
          <ActionPanel>
            <ActionSettings />
          </ActionPanel>
        }
      />
      {browserSetups.map((browserSetup, index) => {
        return (
          <List.Item
            key={browserSetup.browser.path + index}
            title={browserSetup.browser.name}
            icon={browserSetup.isChecked ? { source: Icon.CheckCircle, tintColor: Color.Green } : Icon.Circle}
            actions={
              <ActionPanel>
                <Action
                  icon={Icon.Link}
                  title={(browserSetup.isChecked ? "Disable " : "Enable ") + browserSetup.browser.name}
                  onAction={async () => {
                    const browserSetups_ = [...browserSetups];
                    browserSetups_[index].isChecked = !browserSetup.isChecked;
                    await LocalStorage.setItem(CacheKey.BrowserSetup, JSON.stringify(browserSetups_));
                    await mutate();
                    await browserTabsMutate();
                  }}
                />
                <Action
                  icon={Icon.ArrowLeftCircle}
                  title={"Back"}
                  shortcut={{ modifiers: ["shift", "cmd"], key: "s" }}
                  onAction={useNavigation().pop}
                />
                <ActionSettings />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
