import { Icon, MenuBarExtra, launchCommand, LaunchType, open, openExtensionPreferences } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { AdminTokenError, fetchSnapshot, getMenuBarPreferences } from "./api";
import { menuBarUsageRing } from "./branding";
import { buildQuotaRows, findPaceRow, formatReset, paceLabel, providerShortTitle, selectQuotaRow } from "./quota";

export default function UsageMenuBarCommand() {
  const { baseUrl, menuBarProvider, menuBarWindow, menuBarShowProvider, paceWindow } = getMenuBarPreferences();
  const { data, isLoading, revalidate, error } = useCachedPromise(async () => fetchSnapshot(), [], {
    keepPreviousData: true,
    // The menu bar has no room for a toast; the dropdown surfaces the failure instead.
    failureToastOptions: { title: "Cannot reach OpenCodex" },
  });

  const reports = data?.quotas.reports ?? [];
  // "all" considers every provider; otherwise match the raw id, its vendor prefix
  // (so "anthropic" still selects "anthropic-apikey"), or the short display label.
  const pillReports =
    menuBarProvider === "all"
      ? reports
      : reports.filter((report) => {
          const id = typeof report.provider === "string" ? report.provider.trim().toLowerCase() : "";
          return (
            id === menuBarProvider ||
            id.split(/[-_/]/)[0] === menuBarProvider ||
            providerShortTitle(report).toLowerCase() === menuBarProvider
          );
        });

  const candidates = pillReports.flatMap((report) => {
    const row = selectQuotaRow(buildQuotaRows(report.quota), menuBarWindow);
    return row ? [{ report, row }] : [];
  });

  // When several providers qualify, the pill reports the one under most pressure.
  const leader = candidates.reduce<(typeof candidates)[number] | undefined>(
    (current, entry) => (!current || entry.row.percent > current.row.percent ? entry : current),
    undefined,
  );

  const percent = leader ? Math.round(leader.row.percent) : -1;
  let title: string | undefined;
  if (leader && menuBarShowProvider === "percent") title = `${percent}%`;
  if (leader && menuBarShowProvider === "provider") title = `${providerShortTitle(leader.report)} ${percent}%`;
  const tooltip = error
    ? error instanceof AdminTokenError
      ? `${baseUrl} requires an admin token`
      : `Cannot reach ${baseUrl}`
    : leader
      ? `${providerShortTitle(leader.report)} · ${leader.row.label} ${percent}%`
      : "OpenCodex usage";

  return (
    <MenuBarExtra isLoading={isLoading} icon={menuBarUsageRing(percent)} title={title} tooltip={tooltip}>
      {error && (
        <MenuBarExtra.Item
          icon={error instanceof AdminTokenError ? Icon.Lock : Icon.Plug}
          title={error instanceof AdminTokenError ? "OpenCodex admin token required" : "Cannot reach OpenCodex"}
          subtitle={baseUrl}
          onAction={openExtensionPreferences}
        />
      )}
      {!error && reports.length === 0 && <MenuBarExtra.Item title="No provider quota data" />}
      {reports.map((report) => {
        const rows = buildQuotaRows(report.quota);
        return (
          <MenuBarExtra.Section key={report.provider} title={providerShortTitle(report)}>
            {rows.length === 0 && <MenuBarExtra.Item title="No quota windows" />}
            {rows.map((row) => {
              const paced = findPaceRow([row], paceWindow);
              return (
                <MenuBarExtra.Item
                  key={row.label}
                  icon={menuBarUsageRing(row.percent)}
                  title={`${row.label} · ${Math.round(row.percent)}%${paced ? ` — ${paceLabel(paced.pace)}` : ""}`}
                  subtitle={formatReset(row.resetAt)}
                  onAction={() => open(baseUrl)}
                />
              );
            })}
          </MenuBarExtra.Section>
        );
      })}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Open OpenCodex Dashboard" icon={Icon.Globe} onAction={() => open(baseUrl)} />
        <MenuBarExtra.Item
          title="Open Provider Usage"
          icon={Icon.AppWindowList}
          onAction={() => launchCommand({ name: "provider-usage", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item title="Refresh" icon={Icon.ArrowClockwise} onAction={() => revalidate()} />
        <MenuBarExtra.Item title="Configure…" icon={Icon.Gear} onAction={openExtensionPreferences} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
