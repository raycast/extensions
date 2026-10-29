import { Color, Icon, MenuBarExtra, openExtensionPreferences, Keyboard } from "@raycast/api";
import { ACTIVITY_WINDOW_DAYS } from "./lib/data";
import { refreshTogether, useActivities, usePortfolio } from "./lib/hooks";
import { usePrivacy } from "./lib/privacy";
import { computeFog, dayChange, fogIdleLabel, groupByInstitution, isRecentSnapshot, netWorth } from "./lib/portfolio";
import { formatAsOf, formatMoney, formatMoneyWithCode, formatSnapshotPeriod, MASK, mask } from "./lib/format";
import { oldDataAsOf } from "./lib/snapshot";
import { classifyError } from "./components/empty";
import { launch } from "./components/actions";

export default function MenuBarPortfolio() {
  const { snapshot, isLoading, error, revalidate } = usePortfolio();
  const acts = useActivities(ACTIVITY_WINDOW_DAYS);
  const { privacy, ready, toggle } = usePrivacy();

  const accounts = snapshot?.accounts ?? [];
  const failures = snapshot?.failures ?? [];
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
          : error && classifyError(error) === "sign-in"
            ? "Sign in"
            : "—";
  // Title layout: "<net worth> · ▲ <change>". The arrow glyph sits next to the number it describes; the icon stays neutral.
  // Only a complete, recent change goes in the title: never a partial sum (accounts without history or
  // with snapshots on other dates), and never an old one passed off as today's.
  // Accounts left out of the net worth: couldn't be loaded at all, or SnapTrade reported no total.
  // (A stale account still carries its current /accounts total, so it isn't missing.)
  const excluded = failures.length + nw.missing;
  const delta =
    privacy ||
    excluded > 0 ||
    !primaryChange ||
    !primaryChange.complete ||
    !isRecentSnapshot(primaryChange.asOf, new Date()) ||
    primaryChange.amount === 0
      ? null
      : primaryChange.amount;
  const deltaText =
    delta === null
      ? ""
      : ` · ${delta > 0 ? "▲" : "▼"} ${formatMoney(Math.abs(delta), primaryChange!.currency, { compact: true })}`;
  const titleWithChange = `${title}${deltaText}`;
  // Flag it on the menu bar itself when the net worth shown isn't the whole, current picture.
  // A refresh failed while older data is still on screen (not the Signed out / error screen).
  const showingOld = Boolean(error) && accounts.length > 0;
  // The session ended while older data is still on screen: say so and offer to sign in.
  const signedOutWithData = showingOld && classifyError(error) === "sign-in";
  const degraded = showingOld || excluded > 0;
  const icon = degraded ? { source: Icon.Warning, tintColor: Color.Orange } : Icon.Coins;
  const tooltip = [
    "Folio · net worth.",
    showingOld && snapshot
      ? `${signedOutWithData ? "Signed out" : "Couldn't refresh"}; showing data from ${formatAsOf(snapshot.fetchedAt)}.`
      : "",
    excluded > 0 ? `Leaves out ${excluded} account${excluded === 1 ? "" : "s"}.` : "",
    delta !== null && primaryChange
      ? `The arrow is the change ${formatSnapshotPeriod(primaryChange)} between SnapTrade balance snapshots (including deposits).`
      : "",
  ]
    .filter(Boolean)
    .join(" ");
  // When the data shown was fetched. After a failed refresh the previous data stays up, so say so.
  const updated = !snapshot
    ? null
    : isLoading
      ? { title: "Updating…", tooltip: `Showing data from ${formatAsOf(snapshot.fetchedAt)}` }
      : error
        ? {
            title: `${signedOutWithData ? "Signed out" : "Couldn't refresh"} · showing ${formatAsOf(snapshot.fetchedAt)}`,
            tooltip: error instanceof Error ? error.message : String(error),
          }
        : { title: `Updated ${formatAsOf(snapshot.fetchedAt)}`, tooltip: undefined };

  return (
    <MenuBarExtra icon={icon} title={titleWithChange} tooltip={tooltip} isLoading={isLoading || acts.isLoading}>
      {error && accounts.length === 0 ? (
        <MenuBarExtra.Section title={classifyError(error) === "sign-in" ? "Signed out" : "Folio"}>
          {classifyError(error) === "sign-in" ? (
            <MenuBarExtra.Item title="Sign In with SnapTrade…" onAction={() => launch("sign-in")} />
          ) : classifyError(error) === "not-configured" ? (
            <MenuBarExtra.Item title="Open Preferences…" onAction={openExtensionPreferences} />
          ) : (
            <MenuBarExtra.Item
              icon={{ source: Icon.Warning, tintColor: Color.Orange }}
              title="Couldn't load · Retry"
              tooltip={error instanceof Error ? error.message : String(error)}
              onAction={() => refreshTogether(revalidate, acts.revalidate)}
            />
          )}
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
                          `${up ? "▲" : "▼"} ${formatMoney(Math.abs(c.amount), c.currency)} ${formatSnapshotPeriod(c)}${c.complete ? "" : ` (${c.covered} of ${c.covered + c.missing + c.otherDates} accounts)`}`,
                          privacy,
                        )
                      : undefined
                  }
                  onAction={() => launch("show-portfolio")}
                />
              );
            })}
            {excluded > 0 && (
              <MenuBarExtra.Item
                icon={{ source: Icon.Warning, tintColor: Color.Orange }}
                title={`Leaves out ${excluded} account${excluded === 1 ? "" : "s"}`}
                tooltip={[
                  failures.length ? `${failures.length} couldn't be loaded` : "",
                  nw.missing ? `${nw.missing} have no balance from SnapTrade yet` : "",
                ]
                  .filter(Boolean)
                  .join("; ")}
                onAction={() => launch("show-portfolio")}
              />
            )}
          </MenuBarExtra.Section>
          {groupByInstitution(accounts).map((g) => (
            <MenuBarExtra.Section key={g.institution} title={g.institution}>
              {g.items.map((s) => {
                const oldData = s.stale ? undefined : oldDataAsOf(s);
                return (
                  <MenuBarExtra.Item
                    key={s.account.id}
                    icon={
                      s.stale
                        ? { source: Icon.Warning, tintColor: Color.Orange }
                        : oldData
                          ? { source: Icon.Clock, tintColor: Color.SecondaryText }
                          : undefined
                    }
                    title={s.account.name ?? s.account.number}
                    subtitle={`${mask(
                      formatMoneyWithCode(s.account.balance.total?.amount, s.account.balance.total?.currency),
                      privacy,
                    )}${
                      s.stale
                        ? ` · holdings as of ${formatAsOf(s.stale.asOf)}`
                        : oldData
                          ? ` · data from ${formatAsOf(oldData)}`
                          : ""
                    }`}
                    tooltip={
                      s.stale
                        ? `Couldn't refresh this account's holdings (${s.stale.message}). Showing the last ones loaded, from ${formatAsOf(s.stale.asOf)}.`
                        : oldData
                          ? `SnapTrade's latest data for this account is from ${formatAsOf(oldData)}; it isn't being updated live.`
                          : undefined
                    }
                    onAction={() => launch("show-portfolio")}
                  />
                );
              })}
            </MenuBarExtra.Section>
          ))}
          {failures.length > 0 && (
            <MenuBarExtra.Section title="Not in Net Worth">
              {failures.map((f) => (
                <MenuBarExtra.Item
                  key={f.account.id}
                  icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
                  title={f.account.name ?? f.account.number}
                  subtitle={`${f.account.institution_name} · couldn't load`}
                  tooltip={f.message}
                  onAction={() => launch("show-portfolio")}
                />
              ))}
            </MenuBarExtra.Section>
          )}
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
        {updated && <MenuBarExtra.Item icon={Icon.Clock} title={updated.title} tooltip={updated.tooltip} />}
        {signedOutWithData && (
          <MenuBarExtra.Item icon={Icon.Person} title="Sign In with SnapTrade…" onAction={() => launch("sign-in")} />
        )}
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
          onAction={() => refreshTogether(revalidate, acts.revalidate)}
        />
        <MenuBarExtra.Item icon={Icon.Gear} title="Preferences…" onAction={openExtensionPreferences} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
