import CreateCommand from "./create-ground-packet";
import { latestVersions, matchesQuery } from "./domain/query";
import {
  Action,
  ActionPanel,
  Icon,
  Keyboard,
  List,
  Detail,
  Toast,
  showToast,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GroundPacketDetail } from "./components/GroundPacketDetail";
import type { CarrierType, GroundPacketRecord } from "./domain/types";
import { inspectGroundPackets } from "./services/ledger";

type TypeFilter = "all" | CarrierType;

export default function BrowseGroundPacketsCommand() {
  const [records, setRecords] = useState<GroundPacketRecord[]>([]);
  const [search, setSearch] = useState("");
  const [history, setHistory] = useState(false);
  const [readError, setReadError] = useState<string>();
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [type, setType] = useState<TypeFilter>("all");

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await inspectGroundPackets();
      setRecords(result.records);
      setWarnings(result.warnings);
      setReadError(undefined);
      if (result.warnings.length)
        await showToast({
          style: Toast.Style.Failure,
          title: "Some records could not be read",
          message: `${result.warnings.length} warning(s). Use Show Ledger Warnings.`,
        });
    } catch (error) {
      setReadError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const visible = useMemo(
    () =>
      (history ? records : latestVersions(records)).filter(
        (record) =>
          (type === "all" || record.draft.carrierType === type) &&
          matchesQuery(record, search),
      ),
    [records, history, search, type],
  );
  const utilities = (
    <>
      <Action.Push
        title="Capture New Context"
        icon={Icon.Plus}
        shortcut={Keyboard.Shortcut.Common.New}
        target={<CreateCommand onSaved={refresh} />}
      />
      <Action
        title={history ? "Show Latest Versions" : "Show All Versions"}
        icon={Icon.Clock}
        shortcut={{
          macOS: { modifiers: ["cmd", "shift"], key: "h" },
          Windows: { modifiers: ["ctrl", "shift"], key: "h" },
        }}
        onAction={() => setHistory((v) => !v)}
      />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={refresh}
      />
      {warnings.length > 0 && (
        <Action.Push
          title="Show Ledger Warnings"
          target={<Detail markdown={warnings.join("\n\n")} />}
        />
      )}
    </>
  );

  return (
    <List
      navigationTitle={
        readError
          ? "Ledger unavailable — refresh to retry"
          : warnings.length
            ? `${warnings.length} ledger warning(s)`
            : history
              ? "All Versions"
              : "Latest Context"
      }
      isLoading={isLoading}
      filtering={false}
      searchText={search}
      onSearchTextChange={setSearch}
      searchBarPlaceholder="Search packets, intent, boundaries, or evidence"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by context type"
          value={type}
          onChange={(value) => setType(value as TypeFilter)}
        >
          <List.Dropdown.Item title="All Context Types" value="all" />
          <List.Dropdown.Item title="Projects" value="project" />
          <List.Dropdown.Item title="People" value="person" />
          <List.Dropdown.Item title="Teams" value="team" />
          <List.Dropdown.Item title="Organizations" value="organization" />
          <List.Dropdown.Item title="Other" value="other" />
        </List.Dropdown>
      }
    >
      {visible.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Document}
          title={readError ? "Ledger unavailable" : "No ground packets match"}
          description={
            readError ??
            (warnings.length
              ? "Some records are unreadable. Review ledger warnings."
              : "Create a packet or change the context filter.")
          }
          actions={<ActionPanel>{utilities}</ActionPanel>}
        />
      ) : null}
      {visible.map((record) => (
        <List.Item
          key={record.id}
          icon={Icon.Document}
          title={record.draft.title}
          subtitle={`v${record.version} · ${record.draft.operativeIntent || "Intent not stated"}`}
          keywords={[
            record.draft.situation,
            record.draft.authorityBoundary,
            ...record.draft.explicitRefusals,
            ...record.draft.constraints,
            record.draft.sourceContext,
            record.draft.scopeBoundary,
            ...record.draft.evidence.flatMap((e) => [
              e.claim,
              e.sourceRef ?? "",
              e.observedAt ?? "",
            ]),
          ]}
          accessories={[
            { tag: record.draft.carrierType },
            {
              text: `${record.draft.evidence.filter((item) => item.receiptBearing).length} receipts`,
            },
            { date: new Date(record.createdAt) },
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Inspect Ground Packet"
                icon={Icon.Eye}
                target={
                  <GroundPacketDetail
                    record={record}
                    onChanged={refresh}
                    onDeleted={refresh}
                  />
                }
              />
              {utilities}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
