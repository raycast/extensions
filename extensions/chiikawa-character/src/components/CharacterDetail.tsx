import { Action, ActionPanel, Detail, Icon, Keyboard } from "@raycast/api";
import { CHARACTERS, CATEGORY_LABELS } from "../data/characters";
import { ChiikawaCharacter } from "../types/character";

interface Props {
  character: ChiikawaCharacter;
}

function toMarkdown(character: ChiikawaCharacter): string {
  const personality = character.personality.join(" · ");
  const relationships = character.relationships
    .map((item) => `- **${item.character}** - ${item.description}`)
    .join("\n");
  const funFacts = character.funFacts.map((fact) => `- ${fact}`).join("\n");
  const catchphrases = character.catchphrases?.length
    ? `\n## Catchphrases\n${character.catchphrases.map((p) => `- ${p}`).join("\n")}`
    : "";

  return [
    `# ${character.nameEn} (${character.nameJp})`,
    "",
    `**Category:** ${CATEGORY_LABELS[character.category]}`,
    "",
    character.description,
    "",
    "## Personality",
    personality,
    "",
    "## Relationships",
    relationships,
    "",
    "## Fun Facts",
    funFacts,
    catchphrases,
  ].join("\n");
}

function getRandomCharacter(excludingId: string): ChiikawaCharacter {
  const pool = CHARACTERS.filter((item) => item.id !== excludingId);
  return pool[Math.floor(Math.random() * pool.length)];
}

export function CharacterDetail({ character }: Props) {
  const markdown = toMarkdown(character);
  const randomCharacter = getRandomCharacter(character.id);

  return (
    <Detail
      markdown={markdown}
      navigationTitle={character.nameEn}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Category">
            <Detail.Metadata.TagList.Item text={CATEGORY_LABELS[character.category]} icon={Icon.Tag} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="Name">
            <Detail.Metadata.TagList.Item text={character.nameEn} />
            <Detail.Metadata.TagList.Item text={character.nameJp} />
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Open">
            <Action.OpenInBrowser
              icon={Icon.Globe}
              title="Open Official Page"
              url={character.officialUrl}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
            <Action.Push
              icon={Icon.ArrowClockwise}
              title="View Random Character"
              target={<CharacterDetail character={randomCharacter} />}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              icon={Icon.Clipboard}
              title="Copy Japanese Name"
              content={character.nameJp}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            <Action.CopyToClipboard
              icon={Icon.Text}
              title="Copy Character Bio"
              content={character.description}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            <Action.CopyToClipboard
              icon={Icon.Document}
              title="Copy as Markdown"
              content={markdown}
              shortcut={{ modifiers: ["cmd"], key: "m" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
