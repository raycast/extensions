import { ActionPanel, CopyToClipboardAction, List, Icon, PushAction, OpenInBrowserAction } from "@raycast/api";
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
              accessoryTitle={item.accessoryTitle}
              actions={
                <ActionPanel>
                  <OpenInBrowserAction url={item.url} />
                  <PushAction
                    title="Read Question"
                    target={<QuestionDetail quid={item.id} url={item.url} title={item.title} />}
                    icon={Icon.Download}
                  />
                  <CopyToClipboardAction title="Copy URL" content={item.url} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
};
