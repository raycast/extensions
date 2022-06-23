import { List } from "@raycast/api";
import { StoryListItemProps } from "./interface";

export function Details({ sequence, accessoryTitle, subtitle }: StoryListItemProps) {
  const sequencesText = sequence
    .map((item) =>
      Object.entries(item)
        .filter(([key]) => ["i", "j", "guessesLog10"].indexOf(key) === -1)
        .map(([key, value]) => `${key}: _${value}_\n`)
        .join("\n")
    )
    .join("\n---\n");

  let markdown = subtitle ? `# ${subtitle}\n` : "";
  markdown += accessoryTitle ? `## ${accessoryTitle}\n` : "";
  markdown += sequencesText ? `\n---\n${sequencesText}` : "";

  return <List.Item.Detail markdown={markdown} />;
}
