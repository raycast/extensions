import {
  Action,
  ActionPanel,
  Color,
  Form,
  Icon,
  List,
  Toast,
  showInFinder,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { ErrorView } from "./components/ErrorView";
import { OrgFormDropdown } from "./components/OrgDropdown";
import { RecordActions } from "./components/RecordActions";
import { recordMarkdown, recordSubtitle, recordTitle } from "./format";
import { useSalesforceOrgs } from "./hooks";
import { exportQuery, runQuery } from "./salesforce";
import { addQueryHistory, getHistory, markQuerySaved } from "./storage";
import { QueryHistoryEntry, QueryRequest, SalesforceOrg, SalesforceRecord } from "./types";

export default function RunSoql() {
  const orgState = useSalesforceOrgs();
  if (orgState.error)
    return <ErrorView title="Unable to load Salesforce orgs" error={orgState.error} onRetry={orgState.refresh} />;
  return (
    <QueryForm
      orgs={orgState.orgs}
      activeOrg={orgState.activeOrg}
      isLoading={orgState.isLoading}
      selectOrg={orgState.selectOrg}
    />
  );
}

function QueryForm({
  orgs,
  activeOrg,
  isLoading,
  selectOrg,
  initialQuery = "SELECT Id, Name FROM Account ORDER BY LastModifiedDate DESC LIMIT 50",
  initialTooling = false,
  initialAllRows = false,
}: {
  orgs: SalesforceOrg[];
  activeOrg?: SalesforceOrg;
  isLoading: boolean;
  selectOrg: (orgId: string) => Promise<void>;
  initialQuery?: string;
  initialTooling?: boolean;
  initialAllRows?: boolean;
}) {
  const [orgId, setOrgId] = useState(activeOrg?.orgId ?? "");
  const [soql, setSoql] = useState(initialQuery);
  const [toolingApi, setToolingApi] = useState(initialTooling);
  const [allRows, setAllRows] = useState(initialAllRows);
  const { push } = useNavigation();

  useEffect(() => {
    if (!orgId && activeOrg) setOrgId(activeOrg.orgId);
  }, [activeOrg, orgId]);

  const submit = async () => {
    const org = orgs.find((candidate) => candidate.orgId === orgId);
    if (!org || !soql.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Choose an org and enter a SOQL query" });
      return;
    }
    await selectOrg(org.orgId);
    push(
      <QueryResultsView
        org={org}
        request={{ orgId: org.orgId, alias: org.alias, soql: soql.trim(), toolingApi, allRows }}
      />,
    );
  };

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Run Salesforce SOQL"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run Query" icon={Icon.Play} onSubmit={submit} />
          <Action.Push title="View Query History" icon={Icon.Clock} target={<QueryHistoryList orgs={orgs} />} />
        </ActionPanel>
      }
    >
      <OrgFormDropdown
        orgs={orgs}
        value={orgId}
        onChange={(next) => {
          setOrgId(next);
          void selectOrg(next);
        }}
      />
      <Form.Description
        title={
          !orgId
            ? "Loading Salesforce orgs"
            : orgs.find((org) => org.orgId === orgId)?.isSandbox
              ? "Sandbox query"
              : "PRODUCTION query"
        }
        text="SOQL and Tooling API queries are read-only. Interactive results render at most 500 rows."
      />
      <Form.TextArea id="soql" title="SOQL" value={soql} onChange={setSoql} enableMarkdown={false} />
      <Form.Checkbox id="toolingApi" title="API" label="Use Tooling API" value={toolingApi} onChange={setToolingApi} />
      <Form.Checkbox
        id="allRows"
        title="Rows"
        label="Include deleted and archived rows"
        value={allRows}
        onChange={setAllRows}
      />
    </Form>
  );
}

function QueryResultsView({ org, request }: { org: SalesforceOrg; request: QueryRequest }) {
  const [records, setRecords] = useState<SalesforceRecord[]>([]);
  const [totalSize, setTotalSize] = useState(0);
  const [historyEntry, setHistoryEntry] = useState<QueryHistoryEntry>();
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<Error>();

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const result = await runQuery(request);
      const visible = result.records.slice(0, 500);
      setRecords(visible);
      setTotalSize(result.totalSize);
      setHistoryEntry(
        await addQueryHistory({
          mode: "soql",
          timestamp: new Date().toISOString(),
          orgId: org.orgId,
          orgAlias: org.alias,
          text: request.soql,
          toolingApi: request.toolingApi,
          allRows: request.allRows,
          rowCount: result.totalSize,
          records: visible,
        }),
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught : new Error(String(caught)));
    } finally {
      setLoading(false);
    }
  }, [org.alias, org.orgId, request]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) return <ErrorView title="SOQL query failed" error={error} onRetry={load} />;
  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle={`${org.alias} · ${totalSize} row${totalSize === 1 ? "" : "s"}`}
      searchBarPlaceholder="Filter returned records…"
    >
      {records.map((record, index) => (
        <List.Item
          key={record.Id ?? index}
          icon={{ source: Icon.Dot, tintColor: org.isSandbox ? Color.Blue : Color.Red }}
          title={recordTitle(record)}
          subtitle={recordSubtitle(record)}
          detail={<List.Item.Detail markdown={recordMarkdown(record)} />}
          actions={
            <RecordActions
              org={org}
              record={record}
              onDeleted={() => setRecords((current) => current.filter((candidate) => candidate !== record))}
              extraActions={
                <>
                  <Action title="Rerun Query" icon={Icon.ArrowClockwise} onAction={load} />
                  <Action
                    title="Export Full Query to CSV"
                    icon={Icon.Download}
                    onAction={async () => {
                      const toast = await showToast({ style: Toast.Style.Animated, title: "Exporting query…" });
                      try {
                        const output = await exportQuery(request);
                        toast.style = Toast.Style.Success;
                        toast.title = "Query exported";
                        toast.message = output;
                        await showInFinder(output);
                      } catch (caught) {
                        toast.style = Toast.Style.Failure;
                        toast.title = "Export failed";
                        toast.message = caught instanceof Error ? caught.message : String(caught);
                      }
                    }}
                  />
                  {historyEntry && !historyEntry.saved ? (
                    <Action
                      title="Save Query"
                      icon={Icon.Star}
                      onAction={async () => {
                        await markQuerySaved(historyEntry);
                        setHistoryEntry({ ...historyEntry, saved: true });
                        await showToast({ style: Toast.Style.Success, title: "Query saved" });
                      }}
                    />
                  ) : null}
                </>
              }
            />
          }
        />
      ))}
      {!isLoading && !records.length ? <List.EmptyView title="No records returned" /> : null}
      {totalSize > 500 ? (
        <List.Item
          title={`${totalSize - 500} additional rows are not rendered`}
          subtitle="Use Export Full Query to CSV from any result action panel."
          icon={Icon.Info}
        />
      ) : null}
    </List>
  );
}

function QueryHistoryList({ orgs }: { orgs: SalesforceOrg[] }) {
  const [entries, setEntries] = useState<QueryHistoryEntry[]>([]);
  const [isLoading, setLoading] = useState(true);
  useEffect(() => {
    void getHistory().then((history) => {
      setEntries(
        history.filter((entry): entry is QueryHistoryEntry => entry.kind === "query" && entry.mode === "soql"),
      );
      setLoading(false);
    });
  }, []);
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search recent SOQL…">
      {entries.map((entry) => {
        const org = orgs.find((candidate) => candidate.orgId === entry.orgId);
        return (
          <List.Item
            key={entry.id}
            icon={entry.saved ? Icon.Star : Icon.Clock}
            title={entry.text.replace(/\s+/g, " ")}
            subtitle={`${entry.orgAlias} · ${entry.rowCount} rows`}
            accessories={[{ date: new Date(entry.timestamp) }]}
            actions={
              <ActionPanel>
                {org ? (
                  <Action.Push
                    title="Run Query Again"
                    icon={Icon.Play}
                    target={
                      <QueryResultsView
                        org={org}
                        request={{
                          orgId: org.orgId,
                          alias: org.alias,
                          soql: entry.text,
                          toolingApi: Boolean(entry.toolingApi),
                          allRows: Boolean(entry.allRows),
                        }}
                      />
                    }
                  />
                ) : null}
                <Action.CopyToClipboard title="Copy SOQL" content={entry.text} />
              </ActionPanel>
            }
          />
        );
      })}
      {!isLoading && !entries.length ? <List.EmptyView title="No SOQL history yet" /> : null}
    </List>
  );
}
