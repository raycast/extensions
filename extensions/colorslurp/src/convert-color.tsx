import { List, Icon, ActionPanel, Action, Clipboard, closeMainWindow, showHUD, Color, popToRoot } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getColorFormatsWithConvertedColor, convertColor } from "./scripts";
import { recentColorsCommandPreferences } from "./preferences";
import { useState } from "react";

interface ConvertColorArguments {
  color: string;
}

export default function Command(props: { arguments: ConvertColorArguments }) {
  const { color } = props.arguments;

  const [hexColor, setHexColor] = useState(color);

  // Send the color to ColorSlurp and convert it to all the formats
  const { isLoading, data: formats } = usePromise(async () => {
    const formats = await getColorFormatsWithConvertedColor(color);
    // Here we use the hex color from the converted colors so that
    // any format can be used to set the color of the circle in the list
    setHexColor(formats.find((format) => format.id === "2")?.formattedColor ?? "#000000");
    return formats;
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search">
      {!formats || formats.length === 0 ? (
        <List.EmptyView title="Loading..." />
      ) : (
        formats.map((format, index) => {
          const copy = async () => {
            await Clipboard.copy((await convertColor(format.formattedColor, format.id)) ?? "");
            popToRoot();
            closeMainWindow();
            showHUD("Copied to Clipboard");
          };

          const paste = async () => {
            await Clipboard.paste((await convertColor(format.formattedColor, format.id)) ?? "");
            popToRoot();
            closeMainWindow();
          };

          return (
            <List.Item
              key={index}
              title={format.name}
              icon={{ source: Icon.Code }}
              accessories={[
                { text: format.formattedColor },
                { icon: { source: Icon.CircleFilled, tintColor: hexColor } },
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    {recentColorsCommandPreferences.primaryAction === "copy" ? (
                      <>
                        <Action title="Copy to Clipboard" onAction={copy} />
                        <Action title="Paste in Active App" onAction={paste} />
                      </>
                    ) : (
                      <>
                        <Action title="Paste in Active App" onAction={paste} />
                        <Action title="Copy to Clipboard" onAction={copy} />
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
