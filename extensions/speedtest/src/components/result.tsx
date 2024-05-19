import { Color, Icon, List } from "@raycast/api";
import { SpeedtestResult } from "../lib/speedtest.types";
import { ListItemMetadata } from "./list-item-metadata";

type ResultListItemProps = {
  speedtestResult: SpeedtestResult;
  isLoading: boolean;
  children: JSX.Element;
};

export function ResultListItem({ speedtestResult, isLoading, children }: ResultListItemProps): JSX.Element {
  const { url } = speedtestResult.result;
  return (
    <List.Item
      title="Result Link"
      icon={{ source: Icon.CheckCircle, tintColor: Color.Blue }}
      actions={children}
      accessories={[
        {
          text: isLoading ? "?" : `${url || "?"}`,
        },
      ]}
      detail={speedtestResult && <ListItemMetadata data={speedtestResult} />}
    />
  );
}
