import { ActionPanel, Action, Grid, Icon } from "@raycast/api";
import { useMemo } from "react";
import { EmojiMetadata, EmojiWithUnicode } from "../types";
import { getGStaticUrl, copyImageToClipboard, loadCombinations } from "../utils";

interface MashupGridProps {
  baseEmoji: EmojiWithUnicode;
  index: Record<string, EmojiMetadata>;
}

export function MashupGrid({ baseEmoji, index }: MashupGridProps) {
  const combinations = useMemo(() => {
    const combs = loadCombinations(baseEmoji.unicode);
    return Object.entries(combs).map(([otherUnicode, comboStr]) => {
      const [date, left] = comboStr.split("/");
      const right = left === otherUnicode ? baseEmoji.unicode : otherUnicode;
      
      return {
        otherUnicode,
        date,
        otherEmoji: index[otherUnicode]?.e || "❓",
        otherAlt: index[otherUnicode]?.a || "unknown",
        url: getGStaticUrl(left, right, date),
      };
    });
  }, [baseEmoji, index]);

  return (
    <Grid columns={5} searchBarPlaceholder={`Mashups for ${baseEmoji.e}...`}>
      {combinations.map((combo) => {
        const name = `${baseEmoji.e}_${combo.otherEmoji}_mashup`;
        return (
          <Grid.Item
            key={combo.otherUnicode}
            content={combo.url}
            title={`${baseEmoji.e} + ${combo.otherEmoji}`}
            subtitle={combo.otherAlt}
            actions={
              <ActionPanel>
                <Action 
                  title="Copy Image" 
                  icon={Icon.CopyClipboard}
                  onAction={() => copyImageToClipboard(combo.url, name)} 
                />
                <Action.CopyToClipboard title="Copy Image URL" content={combo.url} />
                <Action.OpenInBrowser title="Open in Browser" url={combo.url} />
                <Action.CopyToClipboard 
                  title="Copy Emoji Combination" 
                  content={`${baseEmoji.e}${combo.otherEmoji}`} 
                />
              </ActionPanel>
            }
          />
        );
      })}
    </Grid>
  );
}
