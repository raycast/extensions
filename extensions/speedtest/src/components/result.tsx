import { List } from "@raycast/api";
import { summarySvg } from "../lib/charts";
import { icons } from "../lib/speedtest-pretty-names";
import { SpeedtestResult } from "../lib/speedtest.types";
import { mdImg } from "../lib/svg";
import { ListItemMetadata } from "./list-item-metadata";

type ResultListItemProps = {
  speedtestResult: SpeedtestResult;
  isLoading: boolean;
  children?: React.ReactNode;
};

export function ResultListItem({ speedtestResult, isLoading, children }: ResultListItemProps) {
  const { url } = speedtestResult.result;
  const markdown = mdImg(summarySvg(speedtestResult), "Speedtest summary", 320);
  return (
    <List.Item
      title="Result Link"
      icon={icons.result}
      actions={children}
      accessories={[
        {
          text: isLoading ? "?" : `${url || "?"}`,
        },
      ]}
      detail={speedtestResult && <ListItemMetadata data={speedtestResult} type="result" markdown={markdown} />}
    />
  );
}
