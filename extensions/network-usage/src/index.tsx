import { Icon, MenuBarExtra } from "@raycast/api";
import millify from "millify";

import useBandwith from "./hooks/useBandwith";

export default function Command() {
  const { bandwith, todaysBandwith } = useBandwith();

  const formatBytePerSecond = (bytePerSecond: number) => {
    const value = millify(bytePerSecond, {
      units: ["B/s", "KB/s", "MB/s", "GB/s", "TB/s"],
      space: true,
    });

    return value;
  };

  const title = bandwith ? formatBytePerSecond(bandwith.rx.bytespersecond) : undefined;

  return (
    <MenuBarExtra title={title} icon={Icon.ArrowDown} isLoading>
      {bandwith && (
        <>
          <MenuBarExtra.Item
            title={formatBytePerSecond(bandwith.rx.bytespersecond)}
            icon={Icon.ArrowDown}
            onAction={() => undefined}
          />
          <MenuBarExtra.Item
            title={formatBytePerSecond(bandwith.tx.bytespersecond)}
            icon={Icon.ArrowUp}
            onAction={() => undefined}
          />
          {todaysBandwith && (
            <>
              <MenuBarExtra.Separator />
              <MenuBarExtra.Item title={`Today\t${todaysBandwith.lastUpdate}`} />
              <MenuBarExtra.Item
                title={`${formatBytePerSecond(todaysBandwith.rx)}`}
                icon={Icon.ArrowDown}
                onAction={() => undefined}
              />
              <MenuBarExtra.Item
                title={`${formatBytePerSecond(todaysBandwith.tx)}`}
                icon={Icon.ArrowUp}
                onAction={() => undefined}
              />
            </>
          )}
        </>
      )}
    </MenuBarExtra>
  );
}
