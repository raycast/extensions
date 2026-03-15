import { Action, ActionPanel, Icon, List } from "@raycast/api";

import IssueListItem from "./components/IssueListItem";
import View from "./components/View";
import { getIcon } from "./helpers/icons";
import { useCustomViews, useCustomViewIssues } from "./hooks/useCustomViews";
import useMe from "./hooks/useMe";
import usePriorities from "./hooks/usePriorities";

function CustomViewIssues({ viewId, viewName }: { viewId: string; viewName: string }) {
  const { issues, isLoadingIssues, mutateList } = useCustomViewIssues(viewId);
  const { priorities, isLoadingPriorities } = usePriorities();
  const { me, isLoadingMe } = useMe();

  const numberOfIssues = issues?.length === 1 ? "1 issue" : `${issues?.length ?? 0} issues`;

  return (
    <List
      navigationTitle={viewName}
      isLoading={isLoadingIssues || isLoadingPriorities || isLoadingMe}
      searchBarPlaceholder="Filter issues"
    >
      <List.Section title={viewName} subtitle={numberOfIssues}>
        {issues?.map((issue) => (
          <IssueListItem issue={issue} key={issue.id} mutateList={mutateList} priorities={priorities} me={me} />
        ))}
      </List.Section>
    </List>
  );
}

function CustomViewList() {
  const { customViews, isLoadingCustomViews } = useCustomViews();

  return (
    <List isLoading={isLoadingCustomViews} searchBarPlaceholder="Search custom views">
      {customViews?.map((view) => {
        const accessories: List.Item.Accessory[] = [];

        if (view.team) {
          accessories.push({ tag: view.team.name, tooltip: `Team: ${view.team.name}` });
        }

        if (view.shared) {
          accessories.push({ icon: Icon.TwoPeople, tooltip: "Shared view" });
        }

        return (
          <List.Item
            key={view.id}
            icon={getIcon({ icon: view.icon, color: view.color, fallbackIcon: Icon.Layers })}
            title={view.name}
            accessories={accessories}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Issues"
                  icon={Icon.List}
                  target={<CustomViewIssues viewId={view.id} viewName={view.name} />}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

export default function Command() {
  return (
    <View>
      <CustomViewList />
    </View>
  );
}

export { CustomViewIssues };
