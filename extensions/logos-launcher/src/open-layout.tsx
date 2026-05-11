import { Action, ActionPanel, Icon, List, Toast, getPreferenceValues, open, showHUD, showToast } from "@raycast/api";
import fs from "fs/promises";
import { useCallback, useEffect, useMemo, useState } from "react";
import { extractErrorMessage } from "./utils/errors";
import { findLayoutsDatabase } from "./logos/installations";
import { getSqlInstance } from "./utils/sql";
import { LOGOS_BUNDLE_ID } from "./logos/constants";
import { encodeForRefLy } from "./utils/encodeForRefLy";

type Preferences = {
  documentsDbPath?: string;
};

type Layout = {
  id: number;
  title: string;
  displayTitle: string;
  guid: string;
  modified?: string;
  uri: string;
  isAuto: boolean;
};

type State = {
  layouts: Layout[];
  isLoading: boolean;
  error?: string;
  dbPath?: string;
};

export default function Command() {
  const preferences = useMemo(() => getPreferenceValues<Preferences>(), []);
  const [state, setState] = useState<State>({ layouts: [], isLoading: true });

  const reload = useCallback(async () => {
    setState((previous) => ({ ...previous, isLoading: true, error: undefined }));
    try {
      const result = await loadLayouts(preferences);
      setState({ layouts: result.layouts, dbPath: result.dbPath, isLoading: false });
    } catch (error) {
      setState({ layouts: [], dbPath: undefined, isLoading: false, error: extractErrorMessage(error) });
    }
  }, [preferences]);

  useEffect(() => {
    reload();
  }, [reload]);

  const openLayout = useCallback(async (layout: Layout) => {
    const uris = buildLayoutUris(layout);
    let lastError: unknown;

    for (const uri of uris) {
      try {
        console.info("[Layouts] Attempting to open layout", { id: layout.id, guid: layout.guid, uri });
        const isHttp = uri.startsWith("http://") || uri.startsWith("https://");
        await open(uri, isHttp ? undefined : LOGOS_BUNDLE_ID);
        await showHUD(`Loading ${layout.title}`);
        return;
      } catch (error) {
        console.error("[Layouts] Failed to open layout URI", { uri, error });
        lastError = error;
      }
    }

    await showToast({
      style: Toast.Style.Failure,
      title: "Could not open Logos",
      message: `${extractErrorMessage(lastError)} — Tried ${uris.join(", ")}`,
    });
  }, []);

  const emptyDescription = state.error
    ? state.error
    : "No layouts found. Save one in Logos or point Raycast at layouts.db.";

  const currentDbPath = state.dbPath;
  const renderRevealAction = currentDbPath
    ? () => <Action.Open title="Reveal Layouts DB" icon={Icon.Eye} target={currentDbPath} application="Finder" />
    : undefined;

  return (
    <List isLoading={state.isLoading} searchBarPlaceholder="Type to filter layouts">
      {state.layouts.length === 0 && !state.isLoading ? (
        <List.EmptyView
          icon={state.error ? Icon.ExclamationMark : Icon.Desktop}
          title={state.error ? "Cannot load layouts" : "No layouts saved"}
          description={emptyDescription}
          actions={
            <ActionPanel>
              <Action title="Reload Layouts" icon={Icon.ArrowClockwise} onAction={reload} />
              {renderRevealAction ? renderRevealAction() : undefined}
            </ActionPanel>
          }
        />
      ) : (
        state.layouts.map((layout) => (
          <List.Item
            key={layout.uri}
            title={layout.displayTitle}
            subtitle={layout.modified ? new Date(layout.modified).toLocaleString() : undefined}
            icon={Icon.Desktop}
            actions={
              <ActionPanel>
                <Action title="Open Layout" icon={Icon.AppWindow} onAction={() => openLayout(layout)} />
                <Action.CopyToClipboard title="Copy Layout URI" content={layout.uri} />
                <Action title="Reload Layouts" icon={Icon.ArrowClockwise} onAction={reload} />
                {renderRevealAction ? renderRevealAction() : undefined}
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

async function loadLayouts(preferences: Preferences) {
  const dbPath = await findLayoutsDatabase(preferences.documentsDbPath);
  const SQL = await getSqlInstance();
  const file = await fs.readFile(dbPath);
  const database = new SQL.Database(new Uint8Array(file));

  try {
    const result = database.exec(
      "SELECT LayoutId AS id, Title AS title, hex(SyncId) AS guidHex, coalesce(SyncDate, CreatedDate) AS modified FROM Layouts WHERE IsDeleted = 0 AND Title IS NOT NULL AND length(Title) > 0",
    );
    if (!result.length) {
      return { layouts: [], dbPath };
    }

    const rows = result[0];
    const deduped = new Map<string, Layout>();
    for (const row of rows.values) {
      const record = Object.fromEntries(rows.columns.map((column, index) => [column, row[index]]));
      const guid = typeof record.guidHex === "string" ? record.guidHex.toLowerCase() : undefined;
      const rawTitle = typeof record.title === "string" ? record.title.trim() : undefined;
      if (!rawTitle || !guid) {
        continue;
      }

      const isAuto = rawTitle.toLowerCase() === "application closed";
      const layout: Layout = {
        id: Number(record.id),
        title: rawTitle,
        displayTitle: isAuto ? "Most Recent Layout" : rawTitle,
        guid,
        modified: record.modified ? String(record.modified) : undefined,
        uri: `logos4:Layout;LayoutGuid=${guid}`,
        isAuto,
      };

      const existing = deduped.get(guid);
      if (!existing || layoutIsNewer(layout, existing)) {
        deduped.set(guid, layout);
      }
    }

    const dedupedLayouts = Array.from(deduped.values());
    const autos = dedupedLayouts.filter((layout) => layout.isAuto);
    const saved = dedupedLayouts.filter((layout) => !layout.isAuto);
    saved.sort((a, b) => a.title.localeCompare(b.title));

    const mostRecentAuto = autos.sort((a, b) => layoutTimestamp(b) - layoutTimestamp(a))[0];
    const finalLayouts = mostRecentAuto ? [mostRecentAuto, ...saved] : saved;
    return { layouts: finalLayouts, dbPath };
  } finally {
    database.close();
  }
}

function buildLayoutUris(layout: Layout) {
  const encodedTitle = encodeURIComponent(layout.title);
  const refLyTitle = encodeForRefLy(layout.title);
  const hyphenGuid = hyphenateGuid(layout.guid);
  const layoutId = String(layout.id);
  return [
    `https://ref.ly/logos4/Layout?layoutId=${layoutId}`,
    `https://ref.ly/logos4/Layout?layoutId=${layoutId}&title=${refLyTitle}`,
    `https://ref.ly/logos4/Layout?layoutGuid=${hyphenGuid}`,
    `https://ref.ly/logos4/Layout?title=${refLyTitle}`,
    `https://ref.ly/logos4/Layout?title=${refLyTitle}&layoutGuid=${hyphenGuid}`,
    `logos4:Layout;layoutId=${layoutId}`,
    `logos4:Layouts;layoutId=${layoutId}`,
    `logos4:Layout;LayoutId=${layoutId}`,
    `logos4:Layout;LayoutGuid=${layout.guid}`,
    `logos4:Layout;LayoutGuid=${hyphenGuid}`,
    `logos4:Layouts;layoutId=${layout.guid}`,
    `logos4:Layouts;layoutId=${hyphenGuid}`,
    `logos4:Layouts;name=${encodedTitle}`,
    `logos4:Layout;Name=${encodedTitle}`,
    `logos4:LayoutManager;layoutGuid=${layout.guid}`,
    `logos4:LayoutManager;layoutGuid=${hyphenGuid}`,
    `logos4-command://layout/open?layoutGuid=${layout.guid}`,
    `logos4-command://layout/open?layoutGuid=${hyphenGuid}`,
  ];
}

function hyphenateGuid(hex: string) {
  if (hex.length !== 32) {
    return hex;
  }
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function layoutTimestamp(layout: Layout) {
  if (layout.modified) {
    const parsed = Date.parse(layout.modified);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return layout.id;
}

function layoutIsNewer(candidate: Layout, current: Layout) {
  return layoutTimestamp(candidate) > layoutTimestamp(current);
}
