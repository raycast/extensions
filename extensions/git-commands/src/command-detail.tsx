import { Action, ActionPanel, Color, Detail, Icon, Keyboard } from "@raycast/api";
import { typeColor, typeDescription, mainCommand } from "./utils";
import { useState } from "react";
import { Alias } from "./types";

export default function CommandDetail({
  alias,
  onFavorite,
  onCopy,
}: {
  alias: Alias;
  onFavorite: () => void;
  onCopy: () => void;
}) {
  const [fav, setFavorite] = useState(alias.fav);
  const { name, command, type, description } = alias;
  const onGitName = `Command "${mainCommand(command)}" documentation`;
  const onGitURL = `https://git-scm.com/docs/git-${mainCommand(command)}`;
  const searchName = "Search for complete command";
  const searchURL = `https://git-scm.com/search/results?search=${encodeURIComponent(command)}`;

  const handleFav = () => {
    setFavorite(!fav);
    onFavorite();
  };

  const markdown = `
# ${name}
###
\`\`\`
${command}
\`\`\`

### ${description}

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
          <Action.CopyToClipboard
            title="Copy Alias"
            content={name}
            onCopy={onCopy}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />

          <ActionPanel.Section>
            {fav ? (
              <Action
                icon={Icon.StarDisabled}
                title="Remove From Favorites"
                onAction={handleFav}
                shortcut={Keyboard.Shortcut.Common.Remove}
              />
            ) : (
              <Action
                icon={Icon.Star}
                title="Add to Favorites"
                onAction={handleFav}
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
          {fav && (
            <>
              <Detail.Metadata.TagList title="">
                <Detail.Metadata.TagList.Item icon={Icon.Star} text="Favorite" color={Color.Yellow} />
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
