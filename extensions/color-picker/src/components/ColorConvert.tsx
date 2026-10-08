import { Action, ActionPanel, List, Clipboard, showHUD, popToRoot, LocalStorage } from "@raycast/api";
import { ColorFormatType } from "../lib/types";

type ColorFormatProps = {
  convertedColor: string;
  title: string;
  value: ColorFormatType;
};

export const ColorConvertListItem = ({ convertedColor, title, value }: ColorFormatProps) => {
  return (
    <List.Item
      title={title}
      subtitle={convertedColor}
      actions={
        <ActionPanel>
          <Action
            title="Copy Converted Color"
            onAction={async () => {
              await Clipboard.copy(convertedColor);
              await showHUD("Copied color to clipboard");
              await LocalStorage.setItem("lastConvertedColorFormat", value);
              await popToRoot({ clearSearchBar: true });
            }}
          />
        </ActionPanel>
      }
    />
  );
};
