import { List, LaunchProps, ActionPanel, Action } from "@raycast/api";
import useKanpla from "./hooks/useKanpla";
import { IMenuItem } from "@taulo1999/kanpla-api";

export default function Command(props: LaunchProps<{ arguments: { date: string } }>) {
  const date = props.arguments.date;
  const kanpla = useKanpla();

  const { isLoading, data } = date ? kanpla.getMenusByDate(new Date(date)) : kanpla.getTodayMenu();
  const onlyWithMenus = data?.filter((item: IMenuItem) => item.menu && item.menu.name) ?? [];

  const noMenuText = date ? "No menus found for this date" : "No menus found for today";

  return (
    <List isLoading={isLoading} isShowingDetail={onlyWithMenus.length > 0}>
      {onlyWithMenus.length === 0 ? (
        <List.EmptyView title={noMenuText} />
      ) : (
        onlyWithMenus.map((item: IMenuItem, index: number) => {
          const menuName = item.menu?.name ?? "No menu";

          return (
            <List.Item
              key={index}
              title={menuName}
              subtitle={item.name}
              detail={
                <List.Item.Detail
                  markdown={item.photo ? `![](${item.photo})` : ""}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Dish" text={menuName} />
                      <List.Item.Detail.Metadata.Label title="Category" text={item.name} />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Link
                        title="Lunch"
                        target="https://app.kanpla.io/app"
                        text="Sign up in Kanpla"
                      />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser title="Sign up in Kanpla" url="https://app.kanpla.io/app" />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
