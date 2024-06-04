import { Action, ActionPanel, Color, Detail, Icon, Keyboard } from "@raycast/api";
import { typeColor, typeDescription, mainCommand } from "./utils";
import { useState } from "react";
import { Alias } from "./types";

export default function CommandDetail({
  alias,
  isFavorite: _isFavorite,
  onFavorite,
  onCopy,
}: {
  alias: Alias;
  isFavorite: boolean;
  onFavorite: () => void;
  onCopy: () => void;
}) {
  const [isFavorite, setIsFavorite] = useState(_isFavorite);
  const { name, command, type, description } = alias;
  const onGitName = `Command "${mainCommand(command)}" documentation`;
  const onGitURL = `https://git-scm.com/docs/git-${mainCommand(command)}`;
  const searchName = "Search for complete command";
  const searchURL = `https://git-scm.com/search/results?search=${encodeURIComponent(command)}`;

  const handleFavorite = () => {
    setIsFavorite(!isFavorite);
    onFavorite();
  };

  const markdown = `
# ${name}
###
\`\`\`
${command}
\`\`\`

### ${description}

${typeDescription(type)}

### Git Documentation
- [${onGitName} ↗](${onGitURL})
- [${searchName} ↗](${searchURL})
###
`;
  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Alias" content={name} onCopy={onCopy} />

          <ActionPanel.Section>
            {isFavorite ? (
              <Action
                icon={Icon.StarDisabled}
                title="Remove Favorites"
                onAction={handleFavorite}
                shortcut={{ modifiers: ["cmd"], key: "x" }}
              />
            ) : (
              <Action
                icon={Icon.Star}
                title="Save Favorite"
                onAction={handleFavorite}
                shortcut={Keyboard.Shortcut.Common.Pin}
              />
            )}
          </ActionPanel.Section>

          <ActionPanel.Section title="Git Documentation">
            <Action.OpenInBrowser icon={Icon.Info} title={onGitName} url={onGitURL} />
            <Action.OpenInBrowser icon={Icon.MagnifyingGlass} title={searchName} url={searchURL} />
          </ActionPanel.Section>
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          {isFavorite && (
            <>
              <Detail.Metadata.TagList title="">
                <Detail.Metadata.TagList.Item text="Favorite" color={Color.Yellow} />
              </Detail.Metadata.TagList>

              <Detail.Metadata.Separator />
            </>
          )}

          <Detail.Metadata.TagList title="Type">
            <Detail.Metadata.TagList.Item text={type} color={typeColor(type)} />
          </Detail.Metadata.TagList>

          <Detail.Metadata.Label title="" text={typeDescription(type)} />
        </Detail.Metadata>
      }
    />
  );
}
