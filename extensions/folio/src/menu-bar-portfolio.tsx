import { Color, Icon, MenuBarExtra, openExtensionPreferences, Keyboard } from "@raycast/api";
import { ACTIVITY_WINDOW_DAYS } from "./lib/data";
import { useActivities, usePortfolio } from "./lib/hooks";
import { usePrivacy } from "./lib/privacy";
import { computeFog, dayChange, fogIdleLabel, groupByInstitution, netWorth } from "./lib/portfolio";
import { formatMoney, formatMoneyWithCode, MASK, mask } from "./lib/format";
import { classifyError } from "./components/empty";
import { launch } from "./components/actions";

export default function MenuBarPortfolio() {
  const { snapshot, isLoading, error, refresh } = usePortfolio();
  const acts = useActivities(ACTIVITY_WINDOW_DAYS);
  const { privacy, ready, toggle } = usePrivacy();

  const accounts = snapshot?.accounts ?? [];
  const nw = netWorth(accounts.map((a) => a.account));
  const change = dayChange(accounts);
  const primaryChange = nw.primary ? change?.find((c) => c.currency === nw.primary?.currency) : undefined;
  const fog =
    snapshot && acts.activities ? computeFog(accounts, acts.activities, new Date(), ACTIVITY_WINDOW_DAYS) : null;

  const title =
    !ready || (isLoading && !snapshot)
      ? "…"
      : privacy
        ? MASK
        : nw.primary
          ? formatMoney(nw.primary.amount, nw.primary.currency, { compact: true })
          : error
            ? "Sign in"
            : "—";
  // Title layout: "<net worth> · ▲ <change>". The arrow glyph sits next to the number it describes; the icon stays neutral.
  const delta = privacy || !primaryChange || primaryChange.amount === 0 ? null : primaryChange.amount;
  const deltaText =
    delta === null
      ? ""
      : ` · ${delta > 0 ? "▲" : "▼"} ${formatMoney(Math.abs(delta), primaryChange!.currency, { compact: true })}`;
  const titleWithChange = `${title}${deltaText}`;
  const icon = Icon.Coins;

  return (
    <MenuBarExtra
      icon={icon}
      title={titleWithChange}
      tooltip="Folio · net worth. The arrow is the change vs the previous SnapTrade balance snapshot and includes deposits."
      isLoading={isLoading || acts.isLoading}
    >
      {error && accounts.length === 0 ? (
        <MenuBarExtra.Section title={classifyError(error) === "sign-in" ? "Signed out" : "Folio"}>
          <MenuBarExtra.Item
            title={classifyError(error) === "sign-in" ? "Sign in with SnapTrade…" : "Open Preferences…"}
            onAction={() => (classifyError(error) === "sign-in" ? launch("sign-in") : openExtensionPreferences())}
          />
        </MenuBarExtra.Section>
      ) : (
        <>
          <MenuBarExtra.Section title="Net Worth">
            {nw.byCurrency.map((t) => {
              const c = change?.find((x) => x.currency === t.currency);
              const up = (c?.amount ?? 0) >= 0;
              return (
                <MenuBarExtra.Item
                  key={t.currency}
                  icon={
                    c && !privacy
                      ? {
                          source: up ? Icon.ArrowUpCircleFilled : Icon.ArrowDownCircleFilled,
                          tintColor: up ? Color.Green : Color.Red,
                        }
                      : Icon.Coins
                  }
                  title={mask(formatMoneyWithCode(t.amount, t.currency), privacy)}
                  subtitle={
                    c
                      ? mask(
                          `${up ? "▲" : "▼"} ${formatMoney(Math.abs(c.amount), c.currency)} vs previous snapshot`,
                          privacy,
                        )
                      : undefined
                  }
                  onAction={() => launch("show-portfolio")}
                />
              );
            })}
          </MenuBarExtra.Section>
          {groupByInstitution(accounts).map((g) => (
            <MenuBarExtra.Section key={g.institution} title={g.institution}>
              {g.items.map((s) => (
                <MenuBarExtra.Item
                  key={s.account.id}
                  title={s.account.name ?? s.account.number}
                  subtitle={mask(
                    formatMoneyWithCode(s.account.balance.total?.amount, s.account.balance.total?.currency),
                    privacy,
                  )}
                  onAction={() => launch("show-portfolio")}
                />
              ))}
            </MenuBarExtra.Section>
          ))}
          {fog && fog.primary && (
            <MenuBarExtra.Section title="Fog">
              <MenuBarExtra.Item
                icon={Icon.Cloud}
                title={`${fogIdleLabel(fog)} days idle`}
                subtitle={mask(`${formatMoneyWithCode(fog.primary.amount, fog.primary.currency)} undeployed`, privacy)}
                onAction={() => launch("show-fog")}
              />
            </MenuBarExtra.Section>
          )}
        </>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item icon={Icon.PieChart} title="Show Portfolio" onAction={() => launch("show-portfolio")} />
        <MenuBarExtra.Item icon={Icon.List} title="Show Positions" onAction={() => launch("show-positions")} />
        <MenuBarExtra.Item icon={Icon.Receipt} title="Show Activities" onAction={() => launch("show-activities")} />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          icon={privacy ? Icon.Eye : Icon.EyeDisabled}
          title={privacy ? "Show Balances" : "Hide Balances"}
          shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
          onAction={() => toggle()}
        />
        <MenuBarExtra.Item
          icon={Icon.ArrowClockwise}
          title="Refresh"
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={() => Promise.all([refresh(), acts.refresh()]).then(() => undefined)}
        />
        <MenuBarExtra.Item icon={Icon.Gear} title="Preferences…" onAction={openExtensionPreferences} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
