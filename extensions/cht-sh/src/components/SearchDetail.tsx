import { Action, ActionPanel, Color, Detail, Icon, useNavigation } from "@raycast/api";
import { searchCheatsheet } from "../utils/api";

interface DetailProps {
  language: string;
  url: string;
  search: string;
  count: number;
}

export default function SearchDetail(props: DetailProps) {
  const { isLoading, data } = searchCheatsheet(props.url, props.search, props.count);

  const { push } = useNavigation();

  let markdown: string;

  if (data && data.match(/\S/)) {
    markdown = `\`\`\`${props.language}\n${data}\n\`\`\``;
  } else if (isLoading) {
    markdown = `Searching for \`${props.url}\`...`;
  } else {
    markdown = `No results found for \`${props.search}\` in \`${props.url}\``;
  }
  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Language" text={props.language} />
          <Detail.Metadata.TagList title="Search">
            {props.search.split(" ").map((search, index) => (
              <Detail.Metadata.TagList.Item key={index} color={Color.Blue} text={search} />
            ))}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="Index" text={props.count.toString()} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action
            icon={Icon.Forward}
            title="Next Result"
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            onAction={() =>
              push(
                <SearchDetail language={props.language} url={props.url} search={props.search} count={props.count + 1} />
              )
            }
          />
        </ActionPanel>
      }
    />
  );
}
