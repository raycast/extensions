import { Color, Icon, List } from "@raycast/api";
import { Digest } from "../types";
import formatDate, { filterByShownStatus } from "../utils/util";

export default function DigestListItem(props: { digest: Digest; itemProps: Partial<List.Item.Props> }) {
  const { digest, itemProps } = props;
  const failedItems = digest.items.filter((item) => item.status === "failedToSummarize");

  const accessories: any[] = filterByShownStatus([
    {
      tag: {
        value: `${failedItems.length} items failed`,
        color: Color.Red,
      },
      show: failedItems.length > 0,
    },
    {
      tag: {
        value: `${digest.items.length} items total`,
      },
      show: true,
    },
    {
      tag: {
        value: digest.type === "manual" ? "Manual" : "Auto",
        color: Color.Green,
      },
      show: true,
    },
  ]);

  return (
    <List.Item
      title={digest.title}
      subtitle={`${formatDate(digest.createAt)}`}
      icon={Icon.Paragraph}
      accessories={accessories}
      {...itemProps}
    />
  );
}
