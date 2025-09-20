import { List, Action, ActionPanel, Icon, Keyboard, openExtensionPreferences, getPreferenceValues } from "@raycast/api";
import { PseudoFont } from "./pseudo-font";

interface FontListItemProps {
  font: PseudoFont;
  searchText: string;
  defaultText: string;
  isPinned: boolean;
  togglePin: (fontName: string) => void;
}

const FontListItem = ({ font, searchText, defaultText, isPinned, togglePin }: FontListItemProps) => {
  const { defaultAction } = getPreferenceValues<Preferences>();
  const convertedText = font.convert(searchText || defaultText);

  const pasteAction = <Action.Paste title="Paste Fancy Text" content={convertedText} />;
  const copyAction = <Action.CopyToClipboard title="Copy Fancy Text" content={convertedText} />;

  return (
    <List.Item
      key={font.fontName}
      title={convertedText}
      accessories={[{ text: font.fontName }]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {defaultAction === "copy" ? copyAction : pasteAction}
            {defaultAction === "copy" ? pasteAction : copyAction}
            <Action
              title={isPinned ? "Unpin Font" : "Pin Font"}
              icon={isPinned ? Icon.PinDisabled : Icon.Pin}
              onAction={() => togglePin(font.fontName)}
              shortcut={Keyboard.Shortcut.Common.Pin}
            />
          </ActionPanel.Section>
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
};

export default FontListItem;
