import React from "react";
import { List, Action, ActionPanel, Icon, Keyboard, getPreferenceValues, openExtensionPreferences } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import fonts from "./fonts.json";

// Helper class for font conversion
class PseudoFont {
  fontName: string;
  fontLower: string[];
  fontUpper: string[];
  fontDigits: string[];
  experimental: boolean;
  private referenceLower = "abcdefghijklmnopqrstuvwxyz";
  private referenceUpper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  private referenceDigits = "0123456789";

  constructor(
    fontName: string,
    fontLower: string | string[],
    fontUpper: string | string[],
    fontDigits: string | string[],
  ) {
    this.fontName = fontName;
    this.fontLower = Array.isArray(fontLower) ? fontLower : [...fontLower];
    this.fontUpper = Array.isArray(fontUpper) ? fontUpper : [...fontUpper];
    this.fontDigits = Array.isArray(fontDigits) ? fontDigits : [...fontDigits];
    this.experimental = false;
  }

  convert(rawText: string): string {
    return [...rawText]
      .map((char) => {
        if (this.referenceLower.includes(char)) {
          return this.fontLower[this.referenceLower.indexOf(char)];
        } else if (this.referenceUpper.includes(char)) {
          return this.fontUpper[this.referenceUpper.indexOf(char)];
        } else if (this.referenceDigits.includes(char)) {
          return this.fontDigits[this.referenceDigits.indexOf(char)];
        }
        return char;
      })
      .join("");
  }
}

export default function Command() {
  const defaultText = "Stay in the flow";
  const [searchText, setSearchText] = React.useState("");
  const [pinnedFonts, setPinnedFonts] = useCachedState<string[]>("pinned-fonts", []);
  const { defaultAction } = getPreferenceValues<Preferences>();

  const togglePin = (fontName: string) => {
    setPinnedFonts((current) =>
      current.includes(fontName) ? current.filter((name) => name !== fontName) : [...current, fontName],
    );
  };

  const pseudoFonts = React.useMemo(() => {
    return fonts.map((font) => {
      const pseudoFont = new PseudoFont(
        font.fontName,
        font.fontLower || "abcdefghijklmnopqrstuvwxyz",
        font.fontUpper || "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        font.fontDigits || "0123456789",
      );
      if (font.experimentalFont) {
        pseudoFont.experimental = true;
      }
      return pseudoFont;
    });
  }, []);

  const { pinnedItems, unpinnedItems } = React.useMemo(() => {
    const fonts = pseudoFonts.filter((font) => !font.experimental);
    return {
      pinnedItems: fonts.filter((font) => pinnedFonts.includes(font.fontName)),
      unpinnedItems: fonts.filter((font) => !pinnedFonts.includes(font.fontName)),
    };
  }, [pinnedFonts]);

  const renderItem = (font: PseudoFont) => {
    const convertedText = font.convert(searchText || defaultText);
    const isPinned = pinnedFonts.includes(font.fontName);

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

  return (
    <List
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Type your text here"
    >
      {pinnedItems.length > 0 && <List.Section title="Pinned">{pinnedItems.map(renderItem)}</List.Section>}

      <List.Section title="Fonts">{unpinnedItems.map(renderItem)}</List.Section>
    </List>
  );
}
