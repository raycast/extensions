import {
  ActionPanel,
  CopyToClipboardAction,
  List,
  OpenInBrowserAction,
  PushAction,
  showToast,
  SubmitFormAction,
  ToastStyle,
} from "@raycast/api";
import { deleteTask, mapProjects, mapSpaces, mapTasks, mapUsers, search, SearchType } from "./lib/api";
import { Project, SearchItem, SearchResult, Space, Task, User } from "./lib/type";
import { useEffect, useState } from "react";
import { Product } from "./lib/client";
import { convertPageURL, convertProjectURL, convertResourceURL, convertSpaceURL, convertTaskURL } from "./lib/util";
import { AddOrUpdateManhour, ManageManhour } from "./manhour";

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
  const [loading, setLoading] = useState<boolean>(true);
  const [users, setUsers] = useState<{ [key: string]: User }>({});
  const [tasks, setTasks] = useState<{ [key: string]: Task }>({});
  const [spaces, setSpaces] = useState<{ [key: string]: Space }>({});
  const [projects, setProjects] = useState<{ [key: string]: Project }>({});

  useEffect(() => {
    (async () => {
      if (props.text) {
        await onSearchTextChange(props.text);
      }
      setLoading(false);
    })();
  }, []);

  const onSearchTextChange = async (text: string) => {
    if (text.length === 0) {
      return;
    }
    setLoading(true);
    try {
      const result: SearchResult = await search(props.product, text, props.searchType);
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
        const users = await mapUsers(userUUIDs);
        setUsers(users);
      }
      if (taskUUIDs.length > 0) {
        const tasks = await mapTasks(taskUUIDs);
        setTasks(tasks);
      }
      if (spaceUUIDs.length > 0) {
        const spaces = await mapSpaces(spaceUUIDs);
        setSpaces(spaces);
      }
      if (projectUUIDs.length > 0) {
        const projects = await mapProjects(projectUUIDs);
        setProjects(projects);
      }
      setSearchResult(result);
    } catch (err) {
      showToast(ToastStyle.Failure, "Search failed", (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <List isLoading={loading} onSearchTextChange={onSearchTextChange} throttle>
      {searchResult.datas.project
        ? searchResult.datas.project.map((item: SearchItem, index: number) => (
            <List.Item
              key={index}
              title={item.fields.name}
              subtitle={users[item.fields.owner] ? users[item.fields.owner].name : ""}
              accessoryIcon={users[item.fields.owner] ? users[item.fields.owner].avatar : ""}
              actions={
                <ActionPanel>
                  <OpenInBrowserAction url={item.url ? item.url : ""} />
                  <CopyToClipboardAction title="Copy URL" content={item.url ? item.url : ""} />
                </ActionPanel>
              }
            />
          ))
        : null}
      {searchResult.datas.task
        ? searchResult.datas.task.map((item: SearchItem, index: number) => (
            <List.Item
              key={index}
              title={`${tasks[item.fields.uuid] ? tasks[item.fields.uuid].priority?.value : ""} #${
                item.fields.number
              } ${item.fields.summary}`}
              subtitle={projects[item.fields.project_uuid] ? projects[item.fields.project_uuid].name : ""}
              accessoryTitle={users[item.fields.assign] ? users[item.fields.assign].name : ""}
              accessoryIcon={users[item.fields.assign] ? users[item.fields.assign].avatar : ""}
              actions={
                <ActionPanel>
                  <OpenInBrowserAction url={item.url ? item.url : ""} />
                  <PushAction
                    icon="⌛️"
                    title="Add Manhour"
                    target={<AddOrUpdateManhour manhourTask={tasks[item.fields.uuid]} />}
                  />
                  <PushAction icon="🗓" title="Manage Manhour" target={<ManageManhour taskUUID={item.fields.uuid} />} />
                  <SubmitFormAction
                    title="Delete Task"
                    icon="⚠️"
                    onSubmit={async () => {
                      try {
                        await deleteTask(item.fields.uuid);
                        showToast(ToastStyle.Success, "Delete task successfully");
                      } catch (err) {
                        showToast(ToastStyle.Failure, "Delete task failed", (err as Error).message);
                      }
                    }}
                  />
                  <CopyToClipboardAction title="Copy URL" content={item.url ? item.url : ""} />
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
                  <OpenInBrowserAction url={item.url ? item.url : ""} />
                  <CopyToClipboardAction title="Copy URL" content={item.url ? item.url : ""} />
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
              subtitle={spaces[item.fields.space_uuid] ? spaces[item.fields.space_uuid].name : ""}
              accessoryTitle={users[item.fields.owner_uuid] ? users[item.fields.owner_uuid].name : ""}
              accessoryIcon={users[item.fields.owner_uuid] ? users[item.fields.owner_uuid].avatar : ""}
              actions={
                <ActionPanel>
                  <OpenInBrowserAction url={item.url ? item.url : ""} />
                  <CopyToClipboardAction title="Copy URL" content={item.url ? item.url : ""} />
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
                  : projects[item.fields.project_uuid]
                  ? projects[item.fields.project_uuid].name
                  : ""
              }
              accessoryTitle={users[item.fields.owner_uuid] ? users[item.fields.owner_uuid].name : ""}
              accessoryIcon={users[item.fields.owner_uuid] ? users[item.fields.owner_uuid].avatar : ""}
              actions={
                <ActionPanel>
                  <OpenInBrowserAction url={item.url ? item.url : ""} />
                  <CopyToClipboardAction title="Copy URL" content={item.url ? item.url : ""} />
                </ActionPanel>
              }
            />
          ))
        : null}
    </List>
  );
}
