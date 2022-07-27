import { Icon, MenuBarExtra } from "@raycast/api";
import { URL } from "node:url";
import millify from "millify";

import useBandwith from "./hooks/useBandwith";

export function faviconUrl(size: number, url: string): string {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?sz=${size}&domain=${domain}`;
  } catch (err) {
    return Icon.Globe;
  }
}

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
