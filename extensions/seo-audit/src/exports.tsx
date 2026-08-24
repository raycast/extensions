// The export actions, shared by the report a run just produced and a report the
// macOS app kept. One list, so the two never drift into offering different
// formats for the same data.

import {
  Action,
  ActionPanel,
  Icon,
  showToast,
  Toast,
  open,
  showInFinder,
} from "@raycast/api";

import { FORMATS, writeReport } from "../lib/exports.mjs";
import type { Report } from "../lib/engine";

const ICON: Record<string, Icon> = {
  html: Icon.Globe,
  markdown: Icon.Text,
  csv: Icon.List,
  json: Icon.Code,
  sitemap: Icon.Map,
};

export function ExportActions({
  report,
  host,
}: {
  report: Report | null;
  host: string;
}) {
  return (
    <ActionPanel.Submenu
      title="Export…"
      icon={Icon.Download}
      shortcut={{ modifiers: ["cmd"], key: "e" }}
    >
      {FORMATS.map((format) => (
        <Action
          key={format.id}
          title={format.label}
          icon={ICON[format.id] ?? Icon.Document}
          onAction={async () => {
            const { path, refused } = writeReport(format.id, report, host);
            if (!path) {
              // The refusal is the useful half — the engine will not build a
              // sitemap from a crawl that did not see the whole site, and
              // saying so beats writing a file that would delete pages.
              await showToast({
                style: Toast.Style.Failure,
                title: "Not written",
                message: refused ?? "",
              });
              return;
            }
            await showToast({
              style: Toast.Style.Success,
              title: `Wrote ${format.label}`,
              message: path,
              primaryAction: {
                title: "Show in Finder",
                onAction: () => showInFinder(path),
              },
              secondaryAction: { title: "Open", onAction: () => open(path) },
            });
          }}
        />
      ))}
    </ActionPanel.Submenu>
  );
}
