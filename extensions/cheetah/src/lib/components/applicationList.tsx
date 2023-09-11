import {
  ActionPanel,
  Action,
  List,
  Application,
  open,
  Icon,
  showHUD,
} from "@raycast/api";
import { setProjectApp } from "cheetah-core";
import { useEffect } from "react";
import useGetApplicationList from "../effects/useGetApplicationList";

export default ({ projectPath }: { projectPath: string }) => {
  const [applicationList, isLoading, getApplicationList] =
    useGetApplicationList();

  useEffect(() => {
    getApplicationList();
  }, []);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search application name..."
    >
      <List.Section title="Results" subtitle={applicationList?.length + ""}>
        {applicationList?.map((searchResult: Application) => (
          <SearchListItem
            key={searchResult.name}
            searchResult={searchResult}
            projectPath={projectPath}
          />
        ))}
      </List.Section>
    </List>
  );
};

function SearchListItem({
  searchResult,
  projectPath,
}: {
  searchResult: Application;
  projectPath: string;
}) {
  return (
    <List.Item
      title={searchResult.name}
      subtitle={searchResult.path}
      accessoryTitle={searchResult.bundleId}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title="Choose and Complete"
              icon={Icon.Box}
              onAction={async () => {
                await setProjectApp(projectPath, searchResult.name);
                await open(projectPath, searchResult.name);
                await showHUD("The application is set up and tries to open");
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
