import { Color, List } from "@raycast/api";
import { useGameTitleName } from "../helpers/nintendo";

export const DailyPlayHistoriesListItem = ({
  data,
}: {
  data: {
    titleId: string;
    titleName: string;
    imageUrl: string;
    totalPlayedMinutes: number;
  };
}) => {
  const gameTitle = useGameTitleName(data.titleId);
  data.titleName = gameTitle.data || data.titleName;
  return (
    <List.Item
      key={data.titleId}
      title={data.titleName}
      icon={data.imageUrl}
      accessories={[
        {
          tag: {
            value: data.totalPlayedMinutes + " min",
            color:
              data.totalPlayedMinutes < 60 ? Color.Green : data.totalPlayedMinutes < 120 ? Color.Orange : Color.Red,
          },
        },
      ]}
    />
  );
};
