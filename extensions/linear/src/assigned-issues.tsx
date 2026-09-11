import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useState } from "react";

import { getMyIssuesByView, MyIssuesView } from "./api/getIssues";
import CreateIssueForm from "./components/CreateIssueForm";
import StateIssueList from "./components/StateIssueList";
import View from "./components/View";
import useIssues from "./hooks/useIssues";
import useMe from "./hooks/useMe";
import usePriorities from "./hooks/usePriorities";

const views: { id: MyIssuesView; title: string; icon: Icon; emptyDescription: string }[] = [
  {
    id: "assigned",
    title: "Assigned",
    icon: Icon.Person,
    emptyDescription: "There are no issues assigned to you.",
  },
  {
    id: "created",
    title: "Created",
    icon: Icon.PlusCircle,
    emptyDescription: "There are no issues created by you.",
  },
  {
    id: "subscribed",
    title: "Subscribed",
    icon: Icon.Bell,
    emptyDescription: "There are no issues you are subscribed to.",
  },
];

function MyIssues() {
  const [view, setView] = useState<MyIssuesView>("assigned");

  const { issues, isLoadingIssues, mutateList } = useIssues(getMyIssuesByView, [view]);
  const { priorities, isLoadingPriorities } = usePriorities();
  const { me, isLoadingMe } = useMe();

  const selectedView = views.find(({ id }) => id === view) ?? views[0];

  return (
    <List
      isLoading={isLoadingIssues || isLoadingPriorities || isLoadingMe}
      searchBarPlaceholder="Filter by ID, title, status, assignee or priority"
      filtering={{ keepSectionOrder: true }}
      searchBarAccessory={
        <List.Dropdown tooltip="Change View" value={view} onChange={(value) => setView(value as MyIssuesView)}>
          {views.map(({ id, title, icon }) => (
            <List.Dropdown.Item key={id} value={id} title={title} icon={icon} />
          ))}
        </List.Dropdown>
      }
    >
      <List.EmptyView
        title="No issues"
        description={selectedView.emptyDescription}
        actions={
          <ActionPanel>
            <Action.Push
              title="Create Issue"
              target={
                <CreateIssueForm
                  assigneeId={view === "assigned" ? me?.id : undefined}
                  priorities={priorities}
                  me={me}
                />
              }
            />
          </ActionPanel>
        }
      />

      <StateIssueList mutateList={mutateList} issues={issues} priorities={priorities} me={me} />
    </List>
  );
}

export default function Command() {
  return (
    <View>
      <MyIssues />
    </View>
  );
}
