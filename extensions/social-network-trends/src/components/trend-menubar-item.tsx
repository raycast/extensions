import { getNumberIcon } from "../utils/common-utils";
import { Clipboard, MenuBarExtra, open, showHUD } from "@raycast/api";
import { Trend } from "../types/types";

export function TrendMenubarItem(props: { trend: Trend; index: number }) {
  const { trend, index } = props;
  return (
    <MenuBarExtra.Item
      key={index + trend.name}
      icon={getNumberIcon(index + 1)}
      title={trend.name}
      subtitle={trend.hot}
      onAction={async (event) => {
        if (event.type == "left-click") {
          await open(trend.url);
        } else {
          await Clipboard.copy(trend.name);
          await showHUD("Copied to clipboard");
        }
      }}
    />
  );
}
