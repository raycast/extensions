import { Action, ActionPanel, environment, getSelectedText, Image, List, useUnstableAI } from "@raycast/api";
import { usePromise } from "@raycast/utils";

export function getIcon(index: number): Image.ImageLike {
  const fill = environment.theme === "dark" ? "#CF2F98" : "#9A1B6E";
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
  <rect x="0" y="0" width="40" height="40" fill="${fill}" rx="10"></rect>
  <text
  font-size="22"
  fill="white"
  font-family="Verdana"
  text-anchor="middle"
  alignment-baseline="baseline"
  x="20.5"
  y="32.5">${index}</text>
</svg>
  `.replaceAll("\n", "");

  return {
    source: `data:image/svg+xml,${svg}`,
  };
}

export default function Command() {
  const { data: selectedText, isLoading: isLoadingSelectedText } = usePromise(getSelectedText, []);
  const { data, isLoading } = useUnstableAI(
    `give me 10 different synonyms for ${selectedText} as a comma separated list`,
    { execute: !isLoadingSelectedText }
  );

  const synonyms = data
    .split(",")
    .map((x) => x.trim())
    .filter((x) => x.length > 0);

  return (
    <List isLoading={isLoadingSelectedText || isLoading}>
      {synonyms.map((synonym, index) => (
        <List.Item
          key={index}
          icon={getIcon(index + 1)}
          title={synonym}
          actions={
            <ActionPanel>
              <Action.Paste content={synonym} />
              <Action.CopyToClipboard content={synonym} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
