import { Action, ActionPanel, List, showToast, Toast, Clipboard, showHUD, popToRoot, LocalStorage } from "@raycast/api";
import { getFormattedColor } from "../utils";
import { ColorFormatType } from "../types";

type ColorFormatProps = {
  text: string;
  title: string;
  value: string;
};

function getConvertedColor(text: string, format: ColorFormatType) {
  try {
    const convertedColor = getFormattedColor(text, format);
    return convertedColor;
  } catch {
    showToast({
      style: Toast.Style.Failure,
      title: "Conversion failed",
      message: `"${text}" is not a valid color.`,
    });
  }
}

export const ColorConvertListItem = ({ text, title, value }: ColorFormatProps) => {
  const convertedColor = getConvertedColor(text, value as ColorFormatType);
  if (!convertedColor) return null;

  return (
    <List.Item
      title={title}
      subtitle={convertedColor}
      actions={
        <ActionPanel>
          <Action
            title="Copy Converted Color"
            onAction={async () => {
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
