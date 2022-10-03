import { ActionPanel, List, Icon, Action } from "@raycast/api";
import type { QueryResultItem } from "./SoApi";
import { useVisitedUrls } from "./useVisitedUrls";
import { QuestionDetail } from "./questionDetail";

type Props = {
  sectionNames: string[];
  queryResults: QueryResultItem[][];
  isLoading: boolean;
  onSearchTextChange?: (text: string) => void;
  throttle?: boolean;
};

export const View = ({ sectionNames, queryResults, isLoading, onSearchTextChange, throttle }: Props): JSX.Element => {
  const [urls] = useVisitedUrls();
  return (
    <List isLoading={isLoading} onSearchTextChange={onSearchTextChange} throttle={throttle}>
      {sectionNames.map((sectionName, sectionIndex) => (
        <List.Section
          key={sectionIndex}
          id={`${sectionIndex}`}
          title={sectionName}
          subtitle={`${queryResults[sectionIndex].length}`}
        >
          {queryResults[sectionIndex].map((item) => (
            <List.Item
              key={item.id}
              id={item.id}
              title={item.title + (urls.includes(item.url) ? " (visited)" : "")}
              subtitle={item.subtitle}
              icon={item.icon !== "" ? item.icon : Icon.QuestionMark}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={item.url} />
                  <Action.Push
                    title="Read Question"
                    target={<QuestionDetail quid={item.id} url={item.url} title={item.title} />}
                    icon={Icon.Download}
                  />
                  <Action.CopyToClipboard title="Copy URL" content={item.url} />
                </ActionPanel>
              }
              accessories={[{ text: `${item.answer_count} Answers` }]}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
};
