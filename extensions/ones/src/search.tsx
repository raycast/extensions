import { ActionPanel, Action, List, showToast, Toast, Icon, Alert, confirmAlert } from "@raycast/api";
import { deleteTask, mapProjects, mapSpaces, mapTasks, mapUsers, search, SearchType } from "./lib/api";
import { Project, SearchItem, SearchResult, Space, Task, User } from "./lib/type";
import { useEffect, useState, useCallback } from "react";
import { Product } from "./lib/client";
import { convertPageURL, convertProjectURL, convertResourceURL, convertSpaceURL, convertTaskURL } from "./lib/util";
import { ManageManhour } from "./manhour";

interface Props {
  product: Product;
  searchType: SearchType[];
  start?: number;
  text?: string;
}

export function Search(props: Props) {
  const [searchResult, setSearchResult] = useState<SearchResult>({
    datas: {},
    total: 0,
    has_next: false,
    next_cursor: 0,
    took_time: 0,
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [users, setUsers] = useState<{ [key: string]: User }>({});
  const [tasks, setTasks] = useState<{ [key: string]: Task }>({});
  const [spaces, setSpaces] = useState<{ [key: string]: Space }>({});
  const [projects, setProjects] = useState<{ [key: string]: Project }>({});
  const [searchText, setSearchText] = useState<string>("");

  const onSearchTextChange = useCallback(
    (text: string) => {
      const abortCtrl = new AbortController();
      const fn = async () => {
        if (text.length === 0) {
          return;
        }
        setLoading(true);
        try {
          const result: SearchResult = await search({
            product: props.product,
            query: text,
            types: props.searchType,
            signal: abortCtrl.signal,
          });
          const userUUIDs: string[] = [];
          const taskUUIDs: string[] = [];
          const spaceUUIDs: string[] = [];
          const projectUUIDs: string[] = [];
          result.datas.project = result.datas.project?.map((project) => {
            project.url = convertProjectURL(project.fields.uuid);
            userUUIDs.push(project.fields.owner);
            return project;
          });
          result.datas.task = result.datas.task?.map((task) => {
            task.url = convertTaskURL(task.fields.uuid);
            userUUIDs.push(task.fields.assign);
            taskUUIDs.push(task.fields.uuid);
            projectUUIDs.push(task.fields.project_uuid);
            return task;
          });
          result.datas.space = result.datas.space?.map((space) => {
            space.url = convertSpaceURL(space.fields.uuid);
            return space;
          });
          result.datas.page = result.datas.page?.map((page) => {
            page.url = convertPageURL(page.fields.page_uuid);
            userUUIDs.push(page.fields.owner_uuid);
            spaceUUIDs.push(page.fields.space_uuid);
            return page;
          });
          result.datas.resource = result.datas.resource?.map((resource: SearchItem) => {
            userUUIDs.push(resource.fields.owner_uuid);
            projectUUIDs.push(resource.fields.project_uuid);
            resource.url = convertResourceURL(resource.fields.uuid);
            return resource;
          });

          if (userUUIDs.length > 0) {
            const users = await mapUsers(userUUIDs, abortCtrl.signal);
            setUsers(users);
          }
          if (taskUUIDs.length > 0) {
            const tasks = await mapTasks(taskUUIDs, abortCtrl.signal);
            setTasks(tasks);
          }
          if (spaceUUIDs.length > 0) {
            const spaces = await mapSpaces(spaceUUIDs, abortCtrl.signal);
            setSpaces(spaces);
          }
          if (projectUUIDs.length > 0) {
            const projects = await mapProjects(projectUUIDs, abortCtrl.signal);
            setProjects(projects);
          }
          setSearchResult(result);
          setSearchText(text);
        } catch (err) {
          showToast(Toast.Style.Failure, "Search failed", (err as Error).message);
        } finally {
          setLoading(false);
        }
      };
      fn();
      return () => abortCtrl.abort();
    },
    [setSearchResult, setLoading, setUsers, setTasks, setSpaces, setProjects, setSearchText],
  );

  useEffect(() => {
    onSearchTextChange("");
  }, []);

  const searchAction = (
    <Action.SubmitForm
      title="Refresh"
      onSubmit={async () => {
        await onSearchTextChange(searchText);
      }}
      icon={Icon.ArrowClockwise}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
    />
  );

  return (
    <List isLoading={loading} onSearchTextChange={onSearchTextChange} throttle>
      {searchResult.datas.project
        ? searchResult.datas.project.map((item: SearchItem, index: number) => (
            <List.Item
              key={index}
              title={item.fields.name}
              subtitle={users[item.fields.owner]?.name ?? ""}
              accessories={[
                {
                  icon: users[item.fields.owner]?.avatar ?? "",
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={item.url ?? ""} />
                  <Action.CopyToClipboard title="Copy URL" content={item.url ?? ""} />
                  {searchAction}
                </ActionPanel>
              }
            />
          ))
        : null}
      {searchResult.datas.task
        ? searchResult.datas.task.map((item: SearchItem, index: number) => (
            <List.Item
              key={index}
              title={`${tasks[item.fields.uuid]?.priority?.value ?? ""} #${item.fields.number} ${item.fields.summary}`}
              subtitle={projects[item.fields.project_uuid]?.name ?? ""}
              accessories={[
                {
                  text: users[item.fields.assign]?.name ?? "",
                  icon: users[item.fields.assign]?.avatar ?? "",
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={item.url ?? ""} />
                  <Action.Push
                    icon={Icon.Clock}
                    title="Manage Manhour"
                    target={<ManageManhour task={tasks[item.fields.uuid]} showOthersManhour={true} />}
                  />
                  <Action.SubmitForm
                    title="Delete Task"
                    icon={Icon.Trash}
                    onSubmit={async () => {
                      const options: Alert.Options = {
                        title: "Delete the Task?",
                        message: "You will not be able to recover it",
                        primaryAction: {
                          title: "Delete Task",
                          style: Alert.ActionStyle.Destructive,
                          onAction: async () => {
                            try {
                              await deleteTask(item.fields.uuid);
                              showToast(Toast.Style.Success, "Delete task successfully");
                              await onSearchTextChange(searchText);
                            } catch (err) {
                              showToast(Toast.Style.Failure, "Delete task failed", (err as Error).message);
                            }
                          },
                        },
                      };
                      await confirmAlert(options);
                    }}
                    shortcut={{ modifiers: ["cmd"], key: "delete" }}
                  />
                  <Action.CopyToClipboard title="Copy URL" content={item.url ?? ""} />
                  {searchAction}
                </ActionPanel>
              }
            />
          ))
        : null}
      {searchResult.datas.space
        ? searchResult.datas.space.map((item: SearchItem, index: number) => (
            <List.Item
              key={index}
              title={item.fields.title}
              subtitle={item.fields.description}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={item.url ?? ""} />
                  <Action.CopyToClipboard title="Copy URL" content={item.url ?? ""} />
                  {searchAction}
                </ActionPanel>
              }
            />
          ))
        : null}
      {searchResult.datas.page
        ? searchResult.datas.page.map((item: SearchItem, index: number) => (
            <List.Item
              key={index}
              title={item.fields.title}
              subtitle={spaces[item.fields.space_uuid]?.name ?? ""}
              accessories={[
                {
                  text: users[item.fields.owner_uuid]?.name ?? "",
                  icon: users[item.fields.owner_uuid]?.avatar ?? "",
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={item.url ?? ""} />
                  <Action.CopyToClipboard title="Copy URL" content={item.url ?? ""} />
                  {searchAction}
                </ActionPanel>
              }
            />
          ))
        : null}
      {searchResult.datas.resource
        ? searchResult.datas.resource.map((item: SearchItem, index: number) => (
            <List.Item
              key={index}
              title={item.fields.name}
              subtitle={
                props.product === Product.WIKI
                  ? item.fields.page_title
                  : (projects[item.fields.project_uuid]?.name ?? "")
              }
              accessories={[
                {
                  text: users[item.fields.owner_uuid]?.name ?? "",
                  icon: users[item.fields.owner_uuid]?.avatar ?? "",
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={item.url ?? ""} />
                  <Action.CopyToClipboard title="Copy URL" content={item.url ?? ""} />
                  {searchAction}
                </ActionPanel>
              }
            />
          ))
        : null}
    </List>
  );
}
