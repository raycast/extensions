import { Color, Icon, List } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { katoApi } from "./api";
import {
  formatRecordDetailFields,
  recordDetailMarkdown,
} from "./detail-format";
import { ErrorActions } from "./error-actions";
import { recordAvatar } from "./icons";
import { RecordActions } from "./record-actions";
import type { ObjectTypeOption, RecordSearchResult } from "./types";

function RecordItem({ result }: { result: RecordSearchResult }) {
  const fields = formatRecordDetailFields(result.record.meta);
  return (
    <List.Item
      icon={recordAvatar(result.title, result.avatarUrl, result.record.color)}
      title={result.title}
      subtitle={result.record.objectTypeName}
      accessories={[{ tag: result.record.objectTypeName }]}
      detail={
        <List.Item.Detail
          markdown={recordDetailMarkdown(
            result.title,
            result.record.objectTypeName,
          )}
          metadata={
            <List.Item.Detail.Metadata>
              {fields.map((field) => (
                <List.Item.Detail.Metadata.Label
                  key={`${field.label}-${field.value}`}
                  title={field.label}
                  text={field.value}
                />
              ))}
              {fields.length ? <List.Item.Detail.Metadata.Separator /> : null}
              <List.Item.Detail.Metadata.Link
                title="Kato"
                target={result.webUrl}
                text="Open record"
              />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={<RecordActions record={result} />}
    />
  );
}

export function RecordListView({ object }: { object: ObjectTypeOption }) {
  const [query, setQuery] = useState("");
  const [records, setRecords] = useState<RecordSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [refreshNonce, setRefreshNonce] = useState(0);
  const abortRef = useRef<AbortController | undefined>(undefined);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const timer = setTimeout(
      async () => {
        setIsLoading(true);
        setError(undefined);
        try {
          const next = await katoApi.recordsForObject(
            object.slug,
            query,
            controller.signal,
          );
          setRecords(next);
        } catch (cause) {
          if ((cause as Error).name !== "AbortError")
            setError((cause as Error).message);
        } finally {
          if (!controller.signal.aborted) setIsLoading(false);
        }
      },
      query.trim() ? 250 : 0,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [object, query, refreshNonce]);

  return (
    <List
      isShowingDetail
      isLoading={isLoading}
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder={`Search ${object.pluralName}…`}
      throttle
    >
      {error ? (
        <List.EmptyView
          title="Could not load records"
          description={error}
          icon={Icon.Warning}
          actions={
            <ErrorActions
              command="objects"
              onRetry={() => setRefreshNonce((value) => value + 1)}
            />
          }
        />
      ) : null}
      {!error && !isLoading && query.trim().length === 1 ? (
        <List.EmptyView
          title="Keep typing"
          description="Enter at least two characters to search all records."
          icon={Icon.MagnifyingGlass}
        />
      ) : null}
      {!error && !isLoading && records.length === 0 ? (
        <List.EmptyView
          title={query ? "No matching records" : "No records yet"}
          icon={{ source: Icon.Folder, tintColor: Color.SecondaryText }}
        />
      ) : null}
      {records.map((record) => (
        <RecordItem key={record.id} result={record} />
      ))}
    </List>
  );
}
