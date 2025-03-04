import { Action, ActionPanel, List, Color, useNavigation, Toast, showToast, confirmAlert, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { fetchTodosFromList, markComplete, trashTodo } from "../oauth/auth";
import { htmlToMarkdown } from "../utils/markdown";
import { TodoComments } from "./TodoComments";
import { format } from "date-fns";
import CreateTodoForm from "./CreateTodoForm";
import { BasecampTodo } from "../utils/types";

export default function TodosList({
  accountId,
  projectId,
  todoListId,
}: {
  accountId: string;
  projectId: number;
  todoListId: number;
}) {
  const { pop } = useNavigation();

  const { isLoading, data, pagination, revalidate } = usePromise(
    (accountId: string, projectId: number, todoListId: number) => async (options: { page: number }) => {
      const response = await fetchTodosFromList(accountId, projectId, todoListId, options.page);

      return {
        data: response.data,
        hasMore: response.nextPage !== null,
      };
    },
    [accountId, projectId, todoListId],
  );

  const handleMarkComplete = async (todo: BasecampTodo) => {
    try {
      await markComplete(accountId, projectId, todo.id);
      await showToast(Toast.Style.Success, "Todo marked as complete");
      revalidate();
    } catch (error) {
      await showToast(Toast.Style.Failure, "Failed to mark todo as complete");
    }
  };

  const handleTrashTodo = async (todo: BasecampTodo) => {
    if (await confirmAlert({ title: "Trash Todo", message: "Are you sure you want to trash this todo?" })) {
      try {
        await trashTodo(accountId, projectId, todo.id);
        await showToast(Toast.Style.Success, "Todo moved to trash");
        revalidate();
      } catch (error) {
        await showToast(Toast.Style.Failure, "Failed to trash todo");
      }
    }
  };

  return (
    <List isLoading={isLoading} pagination={pagination} isShowingDetail>
      {data?.map((todo, index) => (
        <List.Item
          key={`${todo.id}-${index}`}
          title={todo.title.slice(0, 27) + (todo.title.length > 27 ? "..." : "")}
          accessories={[...(todo.due_on ? [{ icon: Icon.Calendar, date: new Date(todo.due_on) }] : [])]}
          detail={
            <List.Item.Detail
              markdown={`### ${todo.title}\n\n\n${
                todo.description === "" ? "No description" : htmlToMarkdown(todo.description)
              }`}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Separator />

                  <List.Item.Detail.Metadata.Label
                    title="Status"
                    text={{
                      value: todo.completed ? "Completed" : todo.status === "active" ? "Active" : todo.status,
                      color: todo.completed
                        ? Color.Green
                        : todo.status === "active"
                          ? Color.Orange
                          : Color.SecondaryText,
                    }}
                  />

                  {todo.due_on && (
                    <List.Item.Detail.Metadata.Label title="Due Date" text={format(new Date(todo.due_on), "PPP")} />
                  )}

                  {todo.parent && (
                    <List.Item.Detail.Metadata.Link
                      title="Todo List"
                      text={todo.parent.title}
                      target={todo.parent.app_url}
                    />
                  )}

                  <List.Item.Detail.Metadata.Separator />

                  <List.Item.Detail.Metadata.Label
                    title="Created By"
                    text={todo.creator.name}
                    icon={{ source: todo.creator.avatar_url }}
                  />

                  {todo.creator.company && (
                    <List.Item.Detail.Metadata.Label title="Company" text={todo.creator.company.name} />
                  )}

                  <List.Item.Detail.Metadata.Label title="Created" text={format(new Date(todo.created_at), "PPP")} />

                  {todo.starts_on && (
                    <List.Item.Detail.Metadata.Label title="Starts" text={format(new Date(todo.starts_on), "PPP")} />
                  )}

                  {todo.assignees.length > 0 && (
                    <>
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.TagList title="Assignees">
                        {todo.assignees.map((assignee) => (
                          <List.Item.Detail.Metadata.TagList.Item
                            key={assignee.id}
                            text={assignee.name}
                            icon={{ source: assignee.avatar_url }}
                          />
                        ))}
                      </List.Item.Detail.Metadata.TagList>
                    </>
                  )}

                  {todo.completion_subscribers.length > 0 && (
                    <List.Item.Detail.Metadata.TagList title="Subscribers">
                      {todo.completion_subscribers.map((subscriber) => (
                        <List.Item.Detail.Metadata.TagList.Item
                          key={subscriber.id}
                          text={subscriber.name}
                          icon={{ source: subscriber.avatar_url }}
                        />
                      ))}
                    </List.Item.Detail.Metadata.TagList>
                  )}

                  {todo.comments_count > 0 && (
                    <List.Item.Detail.Metadata.Label title="Comments" text={todo.comments_count.toString()} />
                  )}

                  <List.Item.Detail.Metadata.Separator />

                  <List.Item.Detail.Metadata.Label
                    title="Visibility"
                    text={todo.visible_to_clients ? "Visible to Clients" : "Internal Only"}
                  />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.Push
                title="View Comments"
                target={<TodoComments todo={todo} accountId={accountId} projectId={projectId} />}
              />
              <Action.OpenInBrowser title="Open Todo" url={todo.app_url} />
              {todo.description && (
                <Action.CopyToClipboard
                  title="Copy URL to Todo"
                  content={todo.app_url}
                  shortcut={{ modifiers: ["cmd"], key: "." }}
                />
              )}
              <Action.Push
                title="Create Todo"
                target={
                  <CreateTodoForm
                    accountId={accountId}
                    projectId={projectId}
                    todoListId={todoListId}
                    onSuccess={() => {
                      showToast({
                        style: Toast.Style.Success,
                        title: "Todo Created",
                        message: "Successfully created new todo",
                      });
                      pop();
                      revalidate();
                    }}
                  />
                }
                shortcut={{ modifiers: ["cmd"], key: "n" }}
              />
              <Action
                onAction={() => handleMarkComplete(todo)}
                title="Mark Todo Complete"
                shortcut={{ modifiers: ["cmd"], key: "e" }}
              />
              <Action
                onAction={() => handleTrashTodo(todo)}
                title="Move to Trash"
                shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                style={Action.Style.Destructive}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
