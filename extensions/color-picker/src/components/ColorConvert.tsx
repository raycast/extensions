import { Action, ActionPanel, List, showToast, Toast, Clipboard, showHUD, popToRoot, LocalStorage } from "@raycast/api";
import { getFormattedColor } from "../utils";
import { ColorFormatType } from "../types";

interface ColorFormatProps {
  text: string;
  title: string;
  subtitle: string;
  value: string;
}

async function getConvertedColor(text: string, format: ColorFormatType) {
  try {
    const convertedColor = getFormattedColor(text, format);
    return convertedColor;
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Conversion failed",
      message: `"${text}" is not a valid color.`,
    });
  }
}

export const ColorConvertListItem = ({ text, title, subtitle, value }: ColorFormatProps) => {
  return (
    <List.Item
      title={title}
      subtitle={subtitle}
      actions={
        <ActionPanel>
          <Action
            title="Copy Converted Color"
            onAction={async () => {
              const convertedColor = await getConvertedColor(text, value as ColorFormatType);
              if (convertedColor) {
                await Clipboard.copy(convertedColor);
                await showHUD("Copied color to clipboard");
              }
              LocalStorage.setItem("lastConvertedColorFormat", value);
              popToRoot({ clearSearchBar: true });
            }}
          />
        </ActionPanel>
      }
    />
  );
};
