import { List, Icon, ActionPanel, Action } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getRecentColors, getIsPro } from "./scripts";
import { recentColorsCommandPreferences } from "./preferences";

export default function Command() {
  const { data: isPro } = usePromise(async () => {
    return await getIsPro();
  });

  const { isLoading, data: colors } = usePromise(async () => {
    return await getRecentColors();
  });

  return (
    <List isLoading={isLoading}>
      {!colors || colors.length === 0 || !isPro ? (
        <List.EmptyView
          icon={Icon.Raindrop}
          title={isPro ? "No recent Colors" : "Recent colors requires ColorSlurp PRO"}
        />
      ) : (
        colors.map((color, index) => {
          const formattedColor = color.hex;

          return (
            <List.Item
              key={index}
              title={color.name}
              icon={{ source: Icon.CircleFilled, tintColor: color.hex }}
              accessories={[{ text: formattedColor }]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    {recentColorsCommandPreferences.primaryAction === "copy" ? (
                      <>
                        <Action.CopyToClipboard content={formattedColor} />
                        <Action.Paste content={formattedColor} />
                      </>
                    ) : (
                      <>
                        <Action.Paste content={formattedColor} />
                        <Action.CopyToClipboard content={formattedColor} />
                      </>
                    )}
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
