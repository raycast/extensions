/**
 * List view showing all fonts with ASCII art previews
 */
import { List } from "@raycast/api";
import { useState, useMemo } from "react";
import { FONTS } from "../../data/fonts";
import { generateAsciiArt } from "../../lib/figlet";
import { generatePreviewSvgDataUri } from "../../lib/svg";
import { useGenerateActions } from "../../hooks";
import { GenerateActions } from "./GenerateActions";
import { t } from "../../constants";

interface GenerateViewProps {
  text: string;
}

export function GenerateView({ text }: GenerateViewProps) {
  const [searchText, setSearchText] = useState("");
  const { handleCopy, handlePaste, handleSave } = useGenerateActions({ text });

  const allPreviews = useMemo(() => {
    const fontsToShow = searchText
      ? FONTS.filter((f) => f.name.toLowerCase().includes(searchText.toLowerCase()))
      : FONTS;

    return fontsToShow
      .map((font) => ({
        name: font.name,
        art: generateAsciiArt(text, font.name),
      }))
      .filter((item) => item.art);
  }, [text, searchText]);

  return (
    <List
      searchBarPlaceholder={t("labels.filterFonts")}
      isShowingDetail
      filtering={false}
      onSearchTextChange={setSearchText}
    >
      {allPreviews.map((item) => (
        <List.Item
          key={item.name}
          title={item.name}
          subtitle={`${item.art.split("\n").length} lines`}
          accessories={[{ text: `${item.art.length} chars` }]}
          actions={
            <GenerateActions
              art={item.art}
              fontName={item.name}
              onCopy={handleCopy}
              onPaste={handlePaste}
              onSave={handleSave}
            />
          }
          detail={<List.Item.Detail markdown={`![ASCII Art](${generatePreviewSvgDataUri(item.art)})`} />}
        />
      ))}
    </List>
  );
}
