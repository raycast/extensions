import { getNumberIcon, isEmpty } from "../utils/common-utils";
import { Icon, List } from "@raycast/api";
import { TrendActions } from "./trend-actions";
import { Trend } from "../types/types";

export function TrendListItem(props: { trend: Trend; index: number; keywords: string[] }) {
  const { trend, index, keywords } = props;
  return (
    <List.Item
      icon={getNumberIcon(index + 1)}
      title={trend.name}
      keywords={keywords}
      accessories={isEmpty(trend.hot) ? [] : [{ icon: Icon.Eye, tag: trend.hot }]}
      actions={<TrendActions url={trend.url} name={trend.name} />}
    />
  );
}
