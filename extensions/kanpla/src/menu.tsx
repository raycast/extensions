import { Detail, LaunchProps } from "@raycast/api";
import useKanpla from "./hooks/useKanpla";
import { IMenuItem } from "@taulo1999/kanpla-api";

export default function Command(props: LaunchProps<{ arguments: { date: string } }>) {
  const date = props.arguments.date;
  const kanpla = useKanpla();

  const { isLoading, data } = date ? kanpla.getMenusByDate(new Date(date)) : kanpla.getTodayMenu();
  const loadingText = date ? "Fetching menu for " + date + "..." : "Fetching today's menu...";
  const noMenuText = date ? "No menus available for date: " + date : "No menus available today";

  const splitData = data?.slice(0, 2);
  const photos = splitData?.map((item: IMenuItem) => (item?.photo ? `![](${item.photo})` : ""))?.join("\n\n");
  const markdown = isLoading ? loadingText : photos || noMenuText;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          {splitData?.map((item: IMenuItem, index: number) => (
            <Detail.Metadata.Label key={index} title={item.name} text={item.menu?.name ?? "No menu"} />
          ))}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="Lunch" target="https://app.kanpla.io/app" text="Sign up in Kanpla" />
        </Detail.Metadata>
      }
    />
  );
}
