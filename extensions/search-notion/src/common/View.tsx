import {
  ActionPanel,
  CopyToClipboardAction,
  List,
  OpenInBrowserAction,
  Icon,
  OpenAction,
  getApplications,
  Application,
} from "@raycast/api";
import type { QueryResultItem } from "./notionApi";
import { useVisitedUrls } from "./useVisitedUrls";
import { useEffect, useState } from "react";

type Props = {
  sectionNames: string[];
  queryResults: QueryResultItem[][];
  isLoading: boolean;
  onSearchTextChange?: (text: string) => void;
  throttle?: boolean;
};

function OpenFileAction(props: { fileId: string; onOpen: (target: string) => void }) {
  const [desktopApp, setDesktopApp] = useState<Application>();

  useEffect(() => {
    getApplications()
      .then((apps) => apps.find((a) => a.bundleId === "notion.id"))
      .then(setDesktopApp);
  }, []);

  return desktopApp ? (
    <OpenAction
      icon="command-icon.png"
      title="Open in Notion"
      target={`notion://file/${props.fileId}`}
      application={desktopApp}
      onOpen={() => props.onOpen(props.fileId)}
    />
  ) : (
    <OpenInBrowserAction url={`https://www.notion.so/${props.fileId}`} onOpen={() => props.onOpen(props.fileId)} />
  );
}

export const View = ({ sectionNames, queryResults, isLoading, onSearchTextChange, throttle }: Props): JSX.Element => {
  const [urls, onOpen] = useVisitedUrls();
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
              title={item.title + (urls.includes(item.fileId) ? " (visited)" : "")}
              subtitle={item.subtitle}
              icon={item.icon !== "" ? item.icon : Icon.Document}
              accessoryTitle={item.accessoryTitle}
              actions={
                <ActionPanel>
                  <OpenFileAction fileId={item.fileId} onOpen={onOpen} />
                  <CopyToClipboardAction title="Copy URL" content={`https://www.notion.so/${item.fileId}`} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
};
