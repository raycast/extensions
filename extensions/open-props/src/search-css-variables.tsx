import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import { ActionPanelCssItem } from "./components/action-panel-css-item";
import { useLatestVersion } from "./hooks/useLatestVersion";
import { fetchVars } from "./lib/open-props";
import { config } from "./lib/open-props/v1";

export default function Command() {
  const { version, isVersionLoading, versionError, revalidateVersion } = useLatestVersion("1");
  // For now only version 1 is supported, because version 2 is still in beta
  const { isLoading, data, error, revalidate } = useCachedPromise(
    (packageVersion: string) => fetchVars(config, packageVersion),
    [version ?? ""],
    { execute: !!version },
  );

  const loadError = versionError ?? error;

  return (
    <List isLoading={isVersionLoading || isLoading} searchBarPlaceholder="Search CSS variables...">
      {loadError ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Could not load CSS variables"
          description={loadError.message}
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                onAction={() => {
                  if (versionError) {
                    void revalidateVersion();
                  } else {
                    void revalidate();
                  }
                }}
              />
            </ActionPanel>
          }
        />
      ) : (
        data?.map((section) => (
          <List.Section key={section.file} title={section.name}>
            {section.vars.map((item) => (
              <List.Item
                key={item.name}
                title={item.name}
                accessories={[
                  { text: item.value },
                  ...(section.type === "color"
                    ? [
                        {
                          icon: {
                            source: Icon.CircleFilled,
                            tintColor: item.value,
                          },
                        },
                      ]
                    : []),
                ]}
                actions={<ActionPanelCssItem {...item} />}
              />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
}
