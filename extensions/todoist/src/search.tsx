import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { formatDistanceToNow } from "date-fns";
import { useMemo, useState } from "react";

import LabelListItem from "./components/LabelListItem";
import ProjectListItem from "./components/ProjectListItem";
import TaskComments from "./components/TaskComments";
import TaskDetail from "./components/TaskDetail";
import TaskListItem from "./components/TaskListItem";
import { getCollaboratorIcon, getUserIcon } from "./helpers/collaborators";
import { getPriorityIcon } from "./helpers/priorities";
import { ViewMode, searchBarPlaceholder } from "./helpers/tasks";
import { withTodoistApi } from "./helpers/withTodoistApi";
import useSyncData from "./hooks/useSyncData";

function SearchTasks() {
  const { data, setData, isLoading } = useSyncData();

  const [searchType, setSearchType] = useState("");

  const items = useMemo(() => {
    if (!data) return null;

    if (searchType === "tasks") {
      return data.items.map((task) => (
        <TaskListItem key={task.id} task={task} mode={ViewMode.search} data={data} setData={setData} />
      ));
    }

    if (searchType === "projects") {
      return data.projects.map((project) => (
        <ProjectListItem key={project.id} project={project} data={data} setData={setData} />
      ));
    }

    if (searchType === "labels") {
      return data.labels.map((label) => <LabelListItem key={label.id} label={label} data={data} setData={setData} />);
    }

    if (searchType === "comments") {
      return data.notes.map((note) => {
        const collaborator = data.collaborators.find((collaborator) => collaborator.id === note.posted_uid);
        const correspondingTask = data.items.find((task) => task.id === note.item_id);

        if (!correspondingTask) return null;

        const icon = collaborator ? getCollaboratorIcon(collaborator) : data ? getUserIcon(data.user) : Icon.Person;

        return (
          <List.Item
            key={note.id}
            title={note.content}
            subtitle={formatDistanceToNow(new Date(note.posted_at), { addSuffix: true })}
            accessories={[
              { text: correspondingTask.content, icon: getPriorityIcon(correspondingTask) },
              { icon: note.file_attachment ? Icon.Link : null },
            ]}
            icon={icon}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Task Comments"
                  target={<TaskComments task={correspondingTask} />}
                  icon={Icon.Bubble}
                />

                <Action.Push
                  title="Show Task"
                  target={<TaskDetail taskId={correspondingTask.id} />}
                  icon={Icon.Sidebar}
                />
              </ActionPanel>
            }
          />
        );
      });
    }
  }, [searchType, setData, data]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={searchBarPlaceholder}
      searchBarAccessory={
        <List.Dropdown tooltip="Select View" onChange={setSearchType} storeValue>
          <List.Dropdown.Item title="Tasks" value="tasks" icon={Icon.BulletPoints} />
          <List.Dropdown.Item title="Projects" value="projects" icon={Icon.List} />
          <List.Dropdown.Item title="Labels" value="labels" icon={Icon.Tag} />
          <List.Dropdown.Item title="Comments" value="comments" icon={Icon.SpeechBubble} />
        </List.Dropdown>
      }
    >
      {items}
    </List>
  );
}

export default withTodoistApi(SearchTasks);
