import { Color, Icon, List } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { ErrorView } from "./components/ErrorView";
import { OrgListDropdown } from "./components/OrgDropdown";
import { RecordActions } from "./components/RecordActions";
import { getFieldValue, recordMarkdown, recordSubtitle, recordTitle } from "./format";
import { useSalesforceOrgs } from "./hooks";
import { getSearchObjects } from "./preferences";
import { searchRecords } from "./salesforce";
import { groupSearchRecords } from "./search-groups";
import { addQueryHistory } from "./storage";
import { SalesforceRecord } from "./types";

export default function SearchRecords() {
  const { orgs, activeOrg, isLoading: orgsLoading, error, selectOrg, refresh } = useSalesforceOrgs();
  const [searchText, setSearchText] = useState("");
  const [records, setRecords] = useState<SalesforceRecord[]>([]);
  const [isSearching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<Error>();
  const objects = useMemo(() => getSearchObjects(), []);
  const recordGroups = useMemo(() => groupSearchRecords(records, objects), [objects, records]);

  useEffect(() => {
    if (!activeOrg || searchText.trim().length < 2) {
      setRecords([]);
      setSearchError(undefined);
      return;
    }
    const org = activeOrg;
    const term = searchText.trim();
    const timer = setTimeout(() => {
      void (async () => {
        setSearching(true);
        setSearchError(undefined);
        try {
          const found = await searchRecords(org, term, objects);
          setRecords(found);
          await addQueryHistory({
            mode: "sosl",
            timestamp: new Date().toISOString(),
            orgId: org.orgId,
            orgAlias: org.alias,
            text: term,
            rowCount: found.length,
            records: found,
          });
        } catch (caught) {
          setSearchError(caught instanceof Error ? caught : new Error(String(caught)));
        } finally {
          setSearching(false);
        }
      })();
    }, 400);
    return () => clearTimeout(timer);
  }, [activeOrg, searchText, objects]);

  if (error) return <ErrorView title="Unable to load Salesforce orgs" error={error} onRetry={refresh} />;
  if (searchError)
    return (
      <ErrorView title="Salesforce search failed" error={searchError} onRetry={() => setSearchText(`${searchText} `)} />
    );

  return (
    <List
      isLoading={orgsLoading || isSearching}
      isShowingDetail
      searchBarPlaceholder="Search Salesforce records…"
      searchText={searchText}
      onSearchTextChange={setSearchText}
      throttle
      searchBarAccessory={
        <OrgListDropdown
          orgs={orgs}
          value={activeOrg?.orgId}
          onChange={(orgId) => {
            void selectOrg(orgId);
            setRecords([]);
          }}
        />
      }
    >
      {recordGroups.map((group) => (
        <List.Section
          key={group.apiName}
          title={group.sectionTitle}
          subtitle={`${group.records.length} ${group.records.length === 1 ? "record" : "records"}`}
        >
          {group.records.map((record, index) => {
            const config = objects.find((candidate) => candidate.apiName === group.apiName);
            const configuredTitle = config ? getFieldValue(record, config.titleField) : undefined;
            const configuredSubtitle = config?.subtitleFields
              .map((field) => getFieldValue(record, field))
              .filter((value) => value !== null && value !== undefined && String(value).trim())
              .join(" · ");
            return (
              <List.Item
                key={`${group.apiName}-${record.Id ?? index}`}
                icon={{
                  source: Icon.MagnifyingGlass,
                  tintColor: activeOrg?.isSandbox ? Color.Blue : Color.Red,
                }}
                title={configuredTitle ? String(configuredTitle) : recordTitle(record)}
                subtitle={configuredSubtitle || recordSubtitle(record)}
                accessories={[{ text: group.objectLabel }]}
                detail={<List.Item.Detail markdown={recordMarkdown(record)} />}
                actions={
                  activeOrg ? (
                    <RecordActions
                      org={activeOrg}
                      record={record}
                      onDeleted={() => setRecords((current) => current.filter((candidate) => candidate !== record))}
                    />
                  ) : undefined
                }
              />
            );
          })}
        </List.Section>
      ))}
      {!searchText.trim() ? (
        <List.EmptyView
          title="Search Salesforce"
          description="Enter at least two characters to search configured objects."
          icon={Icon.MagnifyingGlass}
        />
      ) : null}
      {searchText.trim().length >= 2 && !isSearching && !records.length ? (
        <List.EmptyView title="No matching records" />
      ) : null}
    </List>
  );
}
