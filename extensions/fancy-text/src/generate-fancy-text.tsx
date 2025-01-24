import React from "react";
import { List, getSelectedText } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import fonts from "./fonts.json";
import { PseudoFont } from "./pseudo-font";
import FontListItem from "./font-list-item";

export default function Command() {
  const defaultText = "Stay in the flow";
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchText, setSearchText] = React.useState("");
  const [pinnedFonts, setPinnedFonts] = useCachedState<string[]>("pinned-fonts", []);

  React.useEffect(() => {
    const fetchSelectedText = async () => {
      try {
        await getSelectedText();
        const selectedText = await getSelectedText();
        if (selectedText) {
          setSearchText(selectedText);
        }
      } catch (error) {
        setSearchText(defaultText);
      } finally {
        setTimeout(() => setIsLoading(false), 500);
      }
    };
    fetchSelectedText();
  }, []);

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

  if (isLoading) {
    return <List isLoading={true} searchBarPlaceholder="Loading..." searchText="" onSearchTextChange={() => {}} />;
  }

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Type your text here"
    >
      {pinnedItems.length > 0 && (
        <List.Section title="Pinned">
          {pinnedItems.map((font) => (
            <FontListItem
              key={font.fontName}
              font={font}
              searchText={searchText}
              defaultText={defaultText}
              isPinned={pinnedFonts.includes(font.fontName)}
              togglePin={togglePin}
            />
          ))}
        </List.Section>
      )}

      <List.Section title="Fonts">
        {unpinnedItems.map((font) => (
          <FontListItem
            key={font.fontName}
            font={font}
            searchText={searchText}
            defaultText={defaultText}
            isPinned={pinnedFonts.includes(font.fontName)}
            togglePin={togglePin}
          />
        ))}
      </List.Section>
    </List>
  );
}
