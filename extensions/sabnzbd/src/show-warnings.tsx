import { useCachedPromise } from "@raycast/utils";
import { client } from "./sabnzbd";
import { Color, Icon, Image, List } from "@raycast/api";
import dayjs from "dayjs";

enum ErrorType {
  WARNING = "WARNING",
  ERROR = "ERROR",
}

export default function ShowWarnings() {
  const { isLoading, data: warnings } = useCachedPromise(
    async () => {
      return await client.warnings();
    },
    [],
    {
      initialData: [],
      keepPreviousData: true,
      failureToastOptions: {
        title: "Could not load Warnings",
      },
    },
  );
  function getIcon(type: ErrorType): Image.ImageLike {
    switch (type) {
      case ErrorType.ERROR:
        return { source: Icon.Info, tintColor: Color.Red };
      case ErrorType.WARNING:
        return { source: Icon.Warning, tintColor: Color.Yellow };
      default:
        return Icon.QuestionMark;
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search warnings" isShowingDetail>
      {warnings.map((warning, index) => (
        <List.Item
          key={index}
          icon={getIcon(warning.type as unknown as ErrorType)}
          title={warning.type.toString()}
          accessories={[{ date: dayjs.unix(warning.time).toDate() }]}
          detail={<List.Item.Detail markdown={warning.text} />}
        />
      ))}
    </List>
  );
}
