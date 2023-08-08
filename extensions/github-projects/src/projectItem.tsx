import { Action, ActionPanel, List, LocalStorage, PopToRootType, closeMainWindow } from "@raycast/api";
import { Project, View } from "./query";
import dayjs from "dayjs";
import { useCallback } from "react";

export function ProjectItem({ project, view, lastViewed }: { project: Project; view?: View; lastViewed?: number }) {
  const onOpen = useCallback(async (url: string) => {
    const currentJson = await LocalStorage.getItem(`recently-viewed`);

    const hash = currentJson ? JSON.parse(currentJson.toString()) : {};
    const now = Date.now();

    LocalStorage.setItem(
      `recently-viewed`,
      JSON.stringify({
        ...hash,
        [url]: now,
      })
    );

    // for now we just close the entire window, so that when the extension is used it reloads state from localstorage
    // ideally we should be updating state so that the extension can remain open
    closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
  }, []);

  const views = project.views.nodes;
  const title = view ? `${view.name} (View)` : project.title;

  return (
    <List.Item
      key={view ? project.id + view.id : project.id}
      title={title}
      icon={{ source: "table.svg" }}
      accessories={[{ date: new Date(lastViewed ? lastViewed : project.updatedAt) }]}
      detail={
        view ? (
          <List.Item.Detail
            markdown={view ? null : project.shortDescription}
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Last Viewed" text={dayjs(lastViewed).fromNow()} />
                <List.Item.Detail.Metadata.Separator />
              </List.Item.Detail.Metadata>
            }
          />
        ) : (
          <List.Item.Detail
            markdown={project.shortDescription}
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Public" text={project.public.toString()} />
                <List.Item.Detail.Metadata.Separator />
                {lastViewed ? (
                  <>
                    <List.Item.Detail.Metadata.Label title="Last Viewed" text={dayjs(lastViewed).fromNow()} />
                    <List.Item.Detail.Metadata.Separator />
                  </>
                ) : null}
                <List.Item.Detail.Metadata.Label title="Last Updated" text={dayjs(project.updatedAt).fromNow()} />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Items" text={`${project.items.totalCount}`} />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Views" text={`${project.views.totalCount}`} />
                <List.Item.Detail.Metadata.Separator />
              </List.Item.Detail.Metadata>
            }
          />
        )
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open Project"
            url={view ? `${project.url}/views/${view.number}` : project.url}
            onOpen={onOpen}
          />
          <ActionPanel.Submenu title="Open View">
            {views.map((view) => {
              const url = `${project.url}/views/${view.number}`;

              return (
                <Action.OpenInBrowser
                  key={view.id}
                  icon={{ source: "table.svg" }}
                  title={view.name}
                  url={url}
                  onOpen={onOpen}
                />
              );
            })}
          </ActionPanel.Submenu>
        </ActionPanel>
      }
    />
  );
}
