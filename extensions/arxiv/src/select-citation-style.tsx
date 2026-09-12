import { Action, ActionPanel, Icon, List, LocalStorage, showHUD } from "@raycast/api";
import { useEffect, useState } from "react";
import { CitationStyle, CITATION_STYLES, DEFAULT_CITATION_STYLE } from "./citations";
import { CITATION_STYLE_STORAGE_KEY } from "./constants";

export default function SelectCitationStyle() {
  const [citationStyle, setCitationStyle] = useState<CitationStyle>(DEFAULT_CITATION_STYLE);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    LocalStorage.getItem<string>(CITATION_STYLE_STORAGE_KEY).then((storedStyle) => {
      if (storedStyle && isValidCitationStyle(storedStyle)) {
        setCitationStyle(storedStyle as CitationStyle);
      }
      setIsLoading(false);
    });
  }, []);

  const handleSelectStyle = async (style: CitationStyle) => {
    setCitationStyle(style);
    await LocalStorage.setItem(CITATION_STYLE_STORAGE_KEY, style);
    await showHUD(`Citation style set to ${style.toUpperCase()}`);
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search citation styles...">
      {Object.entries(CITATION_STYLES).map(([category, styles]) => (
        <List.Section key={category} title={category}>
          {styles.map((style) => (
            <List.Item
              key={style.id}
              title={style.name}
              icon={citationStyle === style.id ? Icon.CheckCircle : Icon.Circle}
              accessories={citationStyle === style.id ? [{ text: "Current", icon: Icon.Check }] : []}
              actions={
                <ActionPanel>
                  <Action
                    title="Select Citation Style"
                    icon={Icon.Check}
                    onAction={() => handleSelectStyle(style.id as CitationStyle)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function isValidCitationStyle(style: string): style is CitationStyle {
  const allStyles = Object.values(CITATION_STYLES).flatMap((styles) => styles.map((s) => s.id));
  return allStyles.includes(style as CitationStyle);
}
