// Runs the macOS app has already kept.
//
// Both front-ends read the same folder — `~/Library/Application Support/
// seo-audit` — so a crawl run in the window is here a second later without
// anything being synchronised, exported or copied. A seven-minute crawl should
// only ever happen once.
//
// Read-only on purpose. Deleting a report is the app's job, where the
// confirmation and the undo live; a launcher offering to delete somebody's
// seven minutes behind a single Return is not a good trade.

import { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  open,
  openExtensionPreferences,
} from "@raycast/api";

import { causePayload, type Report } from "../lib/engine";
import { ExportActions } from "./exports";
import type { KeptReport } from "../lib/present.mjs";
import {
  appIsInstalled,
  causeRows,
  keptReports,
  readReport,
  summaryLine,
} from "../lib/present.mjs";

export default function Command() {
  const [rows, setRows] = useState<KeptReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setRows(keptReports());
    setLoading(false);
  }, []);

  return (
    <List isLoading={loading} searchBarPlaceholder="Filter by site">
      {!loading && rows.length === 0 && (
        <List.EmptyView
          icon={Icon.Tray}
          title="Nothing kept yet"
          description={
            appIsInstalled()
              ? "Runs finished in the SEO Audit app are kept here. So are runs from Audit Site."
              : "The macOS app keeps every finished run. Install it, or use Audit a Site."
          }
        />
      )}

      {rows.map((row) => (
        <List.Item
          key={row.id}
          icon={{
            source: row.errors > 0 ? Icon.XMarkCircle : Icon.CheckCircle,
            tintColor: row.errors > 0 ? Color.Red : Color.Green,
          }}
          title={row.host}
          subtitle={`${row.pages} pages · ${row.causes} thing${row.causes === 1 ? "" : "s"} to change`}
          accessories={[{ date: row.when }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Open"
                icon={Icon.Eye}
                target={<Kept row={row} />}
              />
              {appIsInstalled() && (
                <Action
                  // "Open in" would be a lie: the app cannot be told which
                  // report to show, so this only launches it. A control that
                  // overstates what it does is worse than one that does less.
                  // eslint-disable-next-line @raycast/prefer-title-case
                  title="Open the SEO Audit App"
                  icon={Icon.Window}
                  onAction={() => open("/Applications/SEO Audit.app")}
                />
              )}
              <Action.ShowInFinder title="Show the JSON" path={row.path} />
              <Action.CopyToClipboard title="Copy Path" content={row.path} />
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                shortcut={{ modifiers: ["cmd"], key: "," }}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

/// One kept run, grouped the way every other front end groups it.
function Kept({ row }: { row: KeptReport }) {
  const stored = readReport(row.path);
  // The grouping is recomputed rather than trusted from the file: a report
  // written before `causes` travelled with it still opens, which is the point
  // of keeping the engine's exact JSON rather than this app's idea of it.
  // A file with no `meta` is a file that is not a report, whatever else is in
  // it — so it stays null and the empty state below says so, rather than being
  // half-assembled into something the export writers would have to refuse.
  const report: Report | null = stored?.meta
    ? {
        meta: stored.meta,
        findings: stored.findings ?? [],
        causes:
          stored.causes ??
          causePayload(stored.findings ?? [], stored.meta.pages),
      }
    : null;
  const causes = causeRows(report);

  return (
    <List
      navigationTitle={row.host}
      searchBarPlaceholder="Filter what to change"
    >
      {!report && (
        <List.EmptyView
          icon={Icon.XMarkCircle}
          title="Could not read that report"
          description="The file is there but is not a report this can open."
        />
      )}
      {causes.map((cause) => (
        <List.Item
          key={cause.id}
          icon={{
            source:
              cause.tone === "error"
                ? Icon.XMarkCircle
                : cause.tone === "warn"
                  ? Icon.ExclamationMark
                  : Icon.Info,
            tintColor:
              cause.tone === "error"
                ? Color.Red
                : cause.tone === "warn"
                  ? Color.Orange
                  : Color.Blue,
          }}
          title={cause.title}
          subtitle={cause.subtitle}
          accessories={[
            { text: String(cause.pages.length), icon: Icon.Document },
          ]}
          actions={
            <ActionPanel>
              <ExportActions report={report} host={row.host} />
              {cause.pages[0] && (
                <Action.OpenInBrowser
                  title="Open First Page"
                  url={cause.pages[0]}
                />
              )}
              <Action.CopyToClipboard
                title="Copy Affected Pages"
                content={cause.pages.join("\n")}
              />
              <Action.CopyToClipboard
                title="Copy Summary"
                content={summaryLine(report)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
