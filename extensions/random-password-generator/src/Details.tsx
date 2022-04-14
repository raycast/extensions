import { List } from "@raycast/api";
import { PasswordDetails } from "./interface";

interface Props {
  data: PasswordDetails | undefined;
}

export function Details({ data }: Props) {
  let markdown = "Loading...";
  if (data) {
    const sequencesText = data.sequence
      .map((item) =>
        Object.entries(item)
          .filter(([key]) => ["i", "j", "guessesLog10"].indexOf(key) === -1)
          .map(([key, value]) => `${key}: _${value}_\n`)
          .join("\n")
      )
      .join("\n---\n");
    const accessoryTitle = `guessed in ${data.crackTime}`;

    markdown = data.warning ? `# ${data.warning}\n` : "";
    markdown += accessoryTitle ? `## ${accessoryTitle}\n` : "";
    markdown += sequencesText ? `\n---\n${sequencesText}` : "";
  }
  return <List.Item.Detail isLoading={!data} markdown={markdown} />;
}
