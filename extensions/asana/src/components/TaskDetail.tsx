import { ActionPanel, Color, Detail, Icon } from "@raycast/api";
import { getAvatarIcon, MutatePromise } from "@raycast/utils";
import { NodeHtmlMarkdown } from "node-html-markdown";
import { Task } from "../api/tasks";
import { asanaToRaycastColor } from "../helpers/colors";
import { getDueDateColor, getDueDateText } from "../helpers/task";
import { useTaskDetail } from "../hooks/useTaskDetail";
import TaskActions from "./TaskActions";

type TaskDetailProps = {
  task: Task;
  workspace?: string;
  mutateList?: MutatePromise<Task[] | undefined>;
};

export default function TaskDetail({ task: originalTask, workspace, mutateList }: TaskDetailProps) {
  const { data: task, isLoading, mutate: mutateDetail } = useTaskDetail(originalTask);

  let markdown = `# ${task.name}`;

  if (task.html_notes) {
    const notes = NodeHtmlMarkdown.translate(task.html_notes.replace(/\n/g, "<br/>"));
    markdown += `\n\n${notes}`;
  }

  return (
    <Detail
      navigationTitle={task.name}
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Completion Status"
            icon={task.completed ? Icon.CheckCircle : Icon.Circle}
            text={task.completed ? "Completed" : "Incomplete"}
          />

          <Detail.Metadata.Label
            title="Assignee"
            icon={task.assignee ? getAvatarIcon(task.assignee.name) : Icon.Person}
            text={task.assignee?.name || "Unassigned"}
          />

          <Detail.Metadata.Label
            title="Due Date"
            icon={{ source: Icon.Calendar, tintColor: getDueDateColor(task) }}
            text={getDueDateText(task)}
          />

          {task.projects && task.projects.length > 0 ? (
            <Detail.Metadata.TagList title={task.projects.length === 1 ? "Project" : "Projects"}>
              {task.projects.map((project) => {
                return (
                  <Detail.Metadata.TagList.Item
                    key={project.gid}
                    text={project.name}
                    color={project.color ? asanaToRaycastColor(project.color) : Color.PrimaryText}
                  />
                );
              })}
            </Detail.Metadata.TagList>
          ) : null}

          {task.custom_fields && task.custom_fields.length > 0
            ? task.custom_fields.map((field) => {
                if (field.resource_subtype === "enum" && field.enum_value) {
                  return (
                    <Detail.Metadata.TagList key={field.gid} title={field.name}>
                      <Detail.Metadata.TagList.Item
                        text={field.enum_value.name}
                        color={asanaToRaycastColor(field.enum_value.color)}
                      />
                    </Detail.Metadata.TagList>
                  );
                }

                return (
                  <Detail.Metadata.Label
                    key={field.gid}
                    title={field.name}
                    text={field.display_value ? field.display_value : "None"}
                  />
                );
              })
            : null}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <TaskActions
            task={task}
            workspace={workspace}
            isDetail={true}
            mutateList={mutateList}
            mutateDetail={mutateDetail}
          />
        </ActionPanel>
      }
    />
  );
}
