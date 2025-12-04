import { Action, ActionPanel, Icon, List, Toast, getPreferenceValues, open, showHUD, showToast } from "@raycast/api";
import fs from "fs/promises";
import { useCallback, useEffect, useMemo, useState } from "react";
import { extractErrorMessage } from "./utils/errors";
import { findReadingPlanDatabase } from "./logos/installations";
import { getSqlInstance } from "./utils/sql";

type Preferences = {
  documentsDbPath?: string;
};

type Plan = {
  documentId: string;
  title: string;
  modified?: string;
  uri: string;
};

type State = {
  plans: Plan[];
  isLoading: boolean;
  error?: string;
  dbPath?: string;
};

export default function Command() {
  const preferences = useMemo(() => getPreferenceValues<Preferences>(), []);
  const [state, setState] = useState<State>({ plans: [], isLoading: true });

  const reload = useCallback(async () => {
    setState((previous) => ({ ...previous, isLoading: true, error: undefined }));
    try {
      const result = await loadReadingPlans(preferences);
      setState({ plans: result.plans, dbPath: result.dbPath, isLoading: false });
    } catch (error) {
      setState({ plans: [], dbPath: undefined, isLoading: false, error: extractErrorMessage(error) });
    }
  }, [preferences]);

  useEffect(() => {
    reload();
  }, [reload]);

  const openPlan = useCallback(async (plan: Plan) => {
    const uris = buildReadingPlanUris(plan);
    let lastError: unknown;

    for (const uri of uris) {
      try {
        const isHttp = uri.startsWith("http://") || uri.startsWith("https://");
        await open(uri, isHttp ? undefined : LOGOS_BUNDLE_ID);
        await showHUD(`Opening ${plan.title}`);
        return;
      } catch (error) {
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
    : "No reading plans found. Create one in Logos or point Raycast at ReadingPlan.db.";

  const currentDbPath = state.dbPath;
  const renderRevealAction = currentDbPath
    ? () => <Action.Open title="Reveal ReadingPlan DB" icon={Icon.Eye} target={currentDbPath} application="Finder" />
    : undefined;

  return (
    <List isLoading={state.isLoading} searchBarPlaceholder="Search reading plans">
      {state.plans.length === 0 && !state.isLoading ? (
        <List.EmptyView
          icon={state.error ? Icon.ExclamationMark : Icon.Book}
          title={state.error ? "Cannot load reading plans" : "No reading plans"}
          description={emptyDescription}
          actions={
            <ActionPanel>
              <Action title="Reload Reading Plans" icon={Icon.ArrowClockwise} onAction={reload} />
              {renderRevealAction ? renderRevealAction() : undefined}
            </ActionPanel>
          }
        />
      ) : (
        state.plans.map((plan) => (
          <List.Item
            key={plan.uri}
            title={plan.title}
            subtitle={plan.modified ? new Date(plan.modified).toLocaleDateString() : undefined}
            icon={Icon.Calendar}
            actions={
              <ActionPanel>
                <Action title="Open Today's Reading" icon={Icon.AppWindow} onAction={() => openPlan(plan)} />
                <Action.CopyToClipboard title="Copy Logos URI" content={plan.uri} />
                <Action title="Reload Reading Plans" icon={Icon.ArrowClockwise} onAction={reload} />
                {renderRevealAction ? renderRevealAction() : undefined}
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

async function loadReadingPlans(preferences: Preferences) {
  const dbPath = await findReadingPlanDatabase(preferences.documentsDbPath);
  const SQL = await getSqlInstance();
  const file = await fs.readFile(dbPath);
  const database = new SQL.Database(new Uint8Array(file));

  try {
    const result = database.exec(
      "SELECT DocumentId AS documentId, Title AS title, ModifiedDate AS modified FROM ReadingPlanDocuments WHERE IsDeleted = 0 AND DocumentId IS NOT NULL AND Title IS NOT NULL",
    );
    if (!result.length) {
      return { plans: [], dbPath };
    }

    const rows = result[0];
    const plans: Plan[] = rows.values.map((row) => {
      const record = Object.fromEntries(rows.columns.map((column, index) => [column, row[index]]));
      const documentId = String(record.documentId);
      const title = String(record.title);
      const modified = record.modified ? String(record.modified) : undefined;
      return {
        documentId,
        title,
        modified,
        uri: `logos4:Document;id=${documentId}`,
      };
    });
    plans.sort((a, b) => a.title.localeCompare(b.title));
    return { plans, dbPath };
  } finally {
    database.close();
  }
}

function buildReadingPlanUris(plan: Plan) {
  const rawGuid = extractPlanGuid(plan.documentId);
  const formattedGuid = hyphenateGuid(rawGuid);
  const encodedDocumentId = encodeURIComponent(plan.documentId);
  const encodedRawGuid = encodeURIComponent(rawGuid);
  const refLyTitle = encodeForRefLy(plan.title);

  return [
    `https://ref.ly/logos4/ReadingPlan?title=${refLyTitle}`,
    `https://ref.ly/logos4/ReadingPlan?title=${refLyTitle}&documentId=${encodedRawGuid}`,
    `logos4:ReadingPlan;documentId=${rawGuid}`,
    `logos4:ReadingPlan;documentId=${formattedGuid}`,
    `logos4:ReadingPlan;name=${plan.title}`,
    `logos4:Document;id=${plan.documentId}`,
    `logos4:Document;id=${encodedDocumentId}`,
    `logos4:Document;id=Document:ReadingPlan:${rawGuid}`,
    `logos4:Document;id=Document:ReadingPlan:${formattedGuid}`,
    `logos4:DocumentManager;name=ReadingPlan;documentId=${rawGuid}`,
    `logos4:DocumentManager;name=ReadingPlan;documentId=${encodedRawGuid}`,
    `logos4-command://readingplan/open?documentId=${rawGuid}`,
    `logos4-command://readingplan/open?documentId=${encodedRawGuid}`,
  ];
}

function extractPlanGuid(documentId: string) {
  const parts = documentId.split(":");
  return parts[parts.length - 1];
}

function hyphenateGuid(hex: string) {
  if (hex.length !== 32) {
    return hex;
  }
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function encodeForRefLy(value: string) {
  return encodeURIComponent(value).replace(/%20/g, "+");
}
const LOGOS_BUNDLE_ID = "com.logos.desktop.logos";
