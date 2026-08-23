import { Action, ActionPanel, Grid, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import { ActionPanelCssItem } from "./components/action-panel-css-item";
import { useLatestVersion } from "./hooks/useLatestVersion";
import { fetchVars } from "./lib/open-props";
import { colorConfig } from "./lib/open-props/v1";

export default function Command() {
  const { version, isVersionLoading, versionError, revalidateVersion } = useLatestVersion("1");
  // For now only version 1 is supported, because version 2 is still in beta
  const { isLoading, data, error, revalidate } = useCachedPromise(
    (packageVersion: string) => fetchVars(colorConfig, packageVersion),
    [version ?? ""],
    { execute: !!version },
  );

  const loadError = versionError ?? error;

  return (
    <Grid
      isLoading={isVersionLoading || isLoading}
      searchBarPlaceholder="Search colors by name and shade..."
      columns={7}
    >
      {loadError ? (
        <Grid.EmptyView
          icon={Icon.ExclamationMark}
          title="Could not load colors"
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
          <Grid.Section key={section.name} title={section.name}>
            {section.vars.map((item) => {
              const shade = item.name.split("-").at(-1);
              return (
                <Grid.Item
                  key={item.name}
                  title={shade ?? item.name}
                  subtitle={item.value}
                  content={{
                    color: {
                      light: item.value,
                      dark: item.value,
                      adjustContrast: false,
                    },
                  }}
                  keywords={[item.name, item.value, section.name, item.value.replace("#", "")]}
                  actions={<ActionPanelCssItem {...item} />}
                />
              );
            })}
          </Grid.Section>
        ))
      )}
    </Grid>
  );
}
