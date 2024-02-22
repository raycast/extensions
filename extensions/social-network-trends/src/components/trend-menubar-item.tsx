import { numberIcons } from "../utils/common-utils";
import { Clipboard, MenuBarExtra, open } from "@raycast/api";
import { Trend } from "../types/types";

export function TrendMenubarItem(props: { trend: Trend; index: number }) {
  const { trend, index } = props;
  return (
    <MenuBarExtra.Item
      key={index + trend.name}
      icon={numberIcons[index]}
      title={trend.name}
      subtitle={trend.hot}
      onAction={async (event: MenuBarExtra.ActionEvent) => {
        if (event.type == "left-click") {
          await open(trend.url);
        } else {
          await Clipboard.copy(trend.name);
        }
      }}
    />
  );
}
