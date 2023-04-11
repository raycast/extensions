import { ActionPanel, Action, List, Icon, Detail } from "@raycast/api";
import { Character, characterSections } from "./characters";

const DEBUG = false;

/**
 * Form the Details view of a selected character
 */
function getDetailMarkdown(char: Character) {
  let detail = `# ${char.value}\n---\n## ${char.label}`;

  if (char.example) {
    detail += `\n> Example: ${char.example}`;
  }

  return detail;
}

/**
 * Combine different properties to support fuzzy search
 */
function getKeywords(char: Character) {
  const definedKeywords = char.keywords ?? [];

  const keywords = [
    char.value,
    char.html.replace(/&|;/g, ""),
    ...char.label.split(/\s/),
    ...definedKeywords,
  ];

  return keywords;
}

export default function Command() {
  if (DEBUG) return <Debug />;

  return (
    <List isShowingDetail>
      {characterSections.map((section) => (
        <List.Section title={section.title} key={section.title}>
          {section.characters.map((char) => (
            <List.Item
              key={char.label}
              title={char.icons ? char.label : char.value}
              subtitle={char.icons ? undefined : char.label}
              icon={char.icons ? { source: char.icons } : undefined}
              keywords={getKeywords(char)}
              detail={
                <List.Item.Detail
                  markdown={getDetailMarkdown(char)}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="HTML"
                        text={char.html}
                      />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard content={char.value} />
                  <Action.Paste content={char.value} />
                  {char.html && (
                    <Action.CopyToClipboard
                      title="Copy HTML"
                      content={char.html}
                      icon={Icon.Code}
                      shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
                    />
                  )}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

/**
 * Debug whether the content (some of which is AI-generated) looks correct
 */
function Debug() {
  const entities = characterSections
    .reduce((acc: Character[], section) => {
      return [...acc, ...section.characters];
    }, [])
    .map((char) => char.html)
    .join("\n");

  return <Detail markdown={entities} />;
}
