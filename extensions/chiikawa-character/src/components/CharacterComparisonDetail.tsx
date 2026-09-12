import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { CATEGORY_LABELS } from "../data/characters";
import { ChiikawaCharacter } from "../types/character";
import { CharacterDetail } from "./CharacterDetail";

interface Props {
  leftCharacter: ChiikawaCharacter;
  rightCharacter: ChiikawaCharacter;
}

function toBulletedList(items: string[]): string {
  return items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "- None";
}

function getSharedTraits(left: ChiikawaCharacter, right: ChiikawaCharacter): string[] {
  const rightTraits = new Set(right.personality.map((item) => item.toLowerCase()));
  return left.personality.filter((item) => rightTraits.has(item.toLowerCase()));
}

function getUniqueTraits(source: ChiikawaCharacter, other: ChiikawaCharacter): string[] {
  const otherTraits = new Set(other.personality.map((item) => item.toLowerCase()));
  return source.personality.filter((item) => !otherTraits.has(item.toLowerCase()));
}

function relationshipLines(character: ChiikawaCharacter): string[] {
  return character.relationships.map((item) => `**${item.character}** - ${item.description}`);
}

function buildMarkdown(left: ChiikawaCharacter, right: ChiikawaCharacter): string {
  const sharedTraits = getSharedTraits(left, right);
  const leftUnique = getUniqueTraits(left, right);
  const rightUnique = getUniqueTraits(right, left);

  return [
    `# ${left.nameEn} vs ${right.nameEn}`,
    "",
    `| Field | ${left.nameEn} | ${right.nameEn} |`,
    "| --- | --- | --- |",
    `| Japanese Name | ${left.nameJp} | ${right.nameJp} |`,
    `| Category | ${CATEGORY_LABELS[left.category]} | ${CATEGORY_LABELS[right.category]} |`,
    `| Personality | ${left.personality.join(", ")} | ${right.personality.join(", ")} |`,
    "",
    "## Shared Personality Traits",
    toBulletedList(sharedTraits),
    "",
    "## Unique Traits",
    `### ${left.nameEn}`,
    toBulletedList(leftUnique),
    "",
    `### ${right.nameEn}`,
    toBulletedList(rightUnique),
    "",
    "## Relationships",
    `### ${left.nameEn}`,
    toBulletedList(relationshipLines(left)),
    "",
    `### ${right.nameEn}`,
    toBulletedList(relationshipLines(right)),
    "",
    "## Fun Facts",
    `### ${left.nameEn}`,
    toBulletedList(left.funFacts),
    "",
    `### ${right.nameEn}`,
    toBulletedList(right.funFacts),
  ].join("\n");
}

export function CharacterComparisonDetail({ leftCharacter, rightCharacter }: Props) {
  const markdown = buildMarkdown(leftCharacter, rightCharacter);

  return (
    <Detail
      markdown={markdown}
      navigationTitle={`${leftCharacter.nameEn} vs ${rightCharacter.nameEn}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Left Character" text={`${leftCharacter.nameEn} (${leftCharacter.nameJp})`} />
          <Detail.Metadata.TagList title="Left Category">
            <Detail.Metadata.TagList.Item icon={Icon.Tag} text={CATEGORY_LABELS[leftCharacter.category]} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Right Character" text={`${rightCharacter.nameEn} (${rightCharacter.nameJp})`} />
          <Detail.Metadata.TagList title="Right Category">
            <Detail.Metadata.TagList.Item icon={Icon.Tag} text={CATEGORY_LABELS[rightCharacter.category]} />
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Character Details">
            <Action.Push
              icon={Icon.Eye}
              title={`Open ${leftCharacter.nameEn} Detail`}
              target={<CharacterDetail character={leftCharacter} />}
            />
            <Action.Push
              icon={Icon.Eye}
              title={`Open ${rightCharacter.nameEn} Detail`}
              target={<CharacterDetail character={rightCharacter} />}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Official Pages">
            <Action.OpenInBrowser
              icon={Icon.Globe}
              title={`Open ${leftCharacter.nameEn} Official Page`}
              url={leftCharacter.officialUrl}
            />
            <Action.OpenInBrowser
              icon={Icon.Globe}
              title={`Open ${rightCharacter.nameEn} Official Page`}
              url={rightCharacter.officialUrl}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard icon={Icon.Document} title="Copy Comparison as Markdown" content={markdown} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
