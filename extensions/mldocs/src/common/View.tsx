import { ActionPanel, CopyToClipboardAction, List, OpenInBrowserAction, Icon } from "@raycast/api";
import type { QueryResultItem } from "./mldocsApi";

type Props = {
  sectionNames: string[];
  queryResults: QueryResultItem[][];
  isLoading: boolean;
  onSearchTextChange?: (text: string) => void;
  throttle?: boolean;
};

export const View = ({ sectionNames, queryResults, isLoading, onSearchTextChange, throttle }: Props): JSX.Element => {
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
              title={item.title}
              icon={item.icon !== "" ? item.icon : Icon.List}
              accessoryTitle={item.accessoryTitle}
              actions={
                <ActionPanel>
                  <OpenInBrowserAction url={item.url} />
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
