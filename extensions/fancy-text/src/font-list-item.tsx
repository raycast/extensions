import { List, Action, ActionPanel, Icon, Keyboard, openExtensionPreferences, getPreferenceValues } from "@raycast/api";
import { PseudoFont } from "./pseudo-font";
import { applyTextDecoration } from "./utils";

interface FontListItemProps {
  font: PseudoFont;
  searchText: string;
  defaultText: string;
  isPinned: boolean;
  togglePin: (fontName: string) => void;
}

const FontListItem = ({ font, searchText, defaultText, isPinned, togglePin }: FontListItemProps) => {
  const { defaultAction, decorationText, defaultDecorationStyle } = getPreferenceValues<Preferences>();
  const convertedText = font.convert(searchText || defaultText);
  const decoratedText = applyTextDecoration(convertedText, decorationText);

  const cleanText = convertedText;
  const surroundedText = decoratedText;

  const isSurroundedDefault = defaultDecorationStyle === "surrounded";
  const defaultTextToUse = isSurroundedDefault ? surroundedText : cleanText;

  const pasteAction = <Action.Paste title="Paste Fancy Text" content={defaultTextToUse} />;
  const copyAction = <Action.CopyToClipboard title="Copy Fancy Text" content={defaultTextToUse} />;

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
            {decorationText && decorationText.trim() !== "" && (
              <>
                {isSurroundedDefault ? (
                  <>
                    <Action.CopyToClipboard title="Copy Clean Fancy Text" content={cleanText} />
                    <Action.Paste title="Paste Clean Fancy Text" content={cleanText} />
                  </>
                ) : (
                  <>
                    <Action.CopyToClipboard title="Copy Surrounded Fancy Text" content={surroundedText} />
                    <Action.Paste title="Paste Surrounded Fancy Text" content={surroundedText} />
                  </>
                )}
              </>
            )}
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
