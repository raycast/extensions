/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Action, ActionPanel, useNavigation, Icon, open } from "@raycast/api";
import { COMMAND, updateHits } from "cheetah-core";
import { refreshKeyword } from "../constant";
import { ResultItem } from "../types";
import ApplicationList from "./applicationList";

export default ({
  searchResult,
  finalAppPath,
  filterProject,
  commandType,
}: {
  searchResult: ResultItem;
  finalAppPath: string;
  filterProject: (keyword: string) => Promise<void>;
  commandType: COMMAND;
}) => {
  if (searchResult.refresh) {
    return (
      <ActionPanel>
        <Action
          title="Refresh Cache"
          icon={Icon.Repeat}
          onAction={() => {
            filterProject(`${refreshKeyword}${searchResult.arg}`);
          }}
        />
      </ActionPanel>
    );
  }
  if (commandType === COMMAND.SET_APPLICATION) {
    const { push } = useNavigation();
    return (
      <ActionPanel>
        <Action
          title="Choose Application"
          icon={Icon.Box}
          onAction={() =>
            push(<ApplicationList projectPath={searchResult.path!} />)
          }
        />
      </ActionPanel>
    );
  }
  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action
          title={`Open in ${finalAppPath}`}
          icon={Icon.Finder}
          onAction={async () => {
            await updateHits(searchResult.path!);
            await open(searchResult.path!, finalAppPath);
          }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.CopyToClipboard
          title="Copy Project Path"
          content={searchResult.path!}
          shortcut={{ modifiers: ["cmd"], key: "." }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
};
