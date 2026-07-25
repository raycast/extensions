import {
  Color,
  Icon,
  MenuBarExtra,
  open,
  openCommandPreferences,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";

import { getDashboard, money, moneyFull, WlthyError, baseUrl } from "./lib/api";

/**
 * Menu-bar net worth — the glanceable surface. Shows the total in the macOS
 * menu bar and refreshes hourly (see `interval` in package.json). The
 * dropdown carries the day / month change and links into the web app.
 * Read-only. On error it shows a quiet "wlthy" title rather than a scary
 * number so the menu bar never lies.
 */
export default function NetWorthMenuBar() {
  const { data, isLoading, error } = usePromise(getDashboard);

  const title = error ? "wlthy" : data ? money(data.net_worth_usd) : undefined;

  const arrow = (usd: number) => (usd > 0 ? "▲" : usd < 0 ? "▼" : "◆");

  return (
    <MenuBarExtra
      icon="wlthy-icon.png"
      title={title}
      isLoading={isLoading}
      tooltip="wlthy net worth"
    >
      {error && (
        <MenuBarExtra.Item
          title={
            error instanceof WlthyError
              ? error.message
              : "Couldn't load net worth"
          }
          onAction={() => openCommandPreferences()}
        />
      )}

      {data && (
        <>
          <MenuBarExtra.Section title="Net worth">
            <MenuBarExtra.Item
              title={moneyFull(data.net_worth_usd)}
              icon={Icon.BankNote}
            />
          </MenuBarExtra.Section>

          <MenuBarExtra.Section title="Change">
            <MenuBarExtra.Item
              title={`Today   ${arrow(data.delta_1d_usd)} ${money(data.delta_1d_usd)}  (${data.delta_1d_pct.toFixed(2)}%)`}
              icon={{
                source: Icon.Dot,
                tintColor: data.delta_1d_usd >= 0 ? Color.Green : Color.Red,
              }}
            />
            <MenuBarExtra.Item
              title={`30 days ${arrow(data.delta_30d_usd)} ${money(data.delta_30d_usd)}  (${data.delta_30d_pct.toFixed(2)}%)`}
              icon={{
                source: Icon.Dot,
                tintColor: data.delta_30d_usd >= 0 ? Color.Green : Color.Red,
              }}
            />
          </MenuBarExtra.Section>

          <MenuBarExtra.Section
            title={`${data.asset_count} assets · ${data.debt_count} debts · USD`}
          >
            <MenuBarExtra.Item
              title="Open in wlthy"
              icon={Icon.Globe}
              onAction={() => open(`${baseUrl()}/networth`)}
            />
            <MenuBarExtra.Item
              title="Preferences…"
              icon={Icon.Gear}
              onAction={() => openCommandPreferences()}
            />
          </MenuBarExtra.Section>
        </>
      )}
    </MenuBarExtra>
  );
}
