// DAG import (parse) errors across environments in scope.

import { hotkey } from "../lib/shortcut";
import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { compareEnvironments, consoleDagsBucketUrl } from "../lib/composer";
import { matches, parseSearch } from "../lib/filter";
import { codeBlock, formatTimestamp, relativeTime } from "../lib/format";
import {
  clientFor,
  envKey,
  errorText,
  queryable,
  refreshEnvironments,
  tierColor,
  tierLabel,
  useEnvironments,
} from "../lib/raycast";
import { ComposerEnvironment, ImportError } from "../lib/types";
import { DagList } from "./dag-list";
import { EnvironmentActions, LoadErrorView, NavigateSection, crumbs, refreshShortcut } from "./env-actions";

function errorMessage(trace: string): string {
  const lines = trace
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return lines[lines.length - 1] ?? "";
}

export function ImportErrorsList(props: { env?: ComposerEnvironment; root?: boolean }) {
  const { data: envData, isLoading: envLoading, error: envError, revalidate: revalidateEnvs } = useEnvironments();
  const [searchText, setSearchText] = useState("");
  const scoped = useMemo(() => {
    const list = queryable(props.env && !envData ? [props.env] : envData?.environments);
    return list.filter((e) => (props.env ? envKey(e) === envKey(props.env) : true)).sort(compareEnvironments);
  }, [envData, props.env]);

  const { data, isLoading, revalidate } = useCachedPromise(
    async (uriList: string[]) =>
      Promise.all(
        scoped
          .filter((e) => uriList.includes(e.airflowUri))
          .map(async (env) => {
            try {
              return { env, errors: await clientFor(env).listImportErrors() };
            } catch (e) {
              return { env, errors: [] as ImportError[], error: errorText(e) };
            }
          }),
      ),
    [scoped.map((e) => e.airflowUri)],
    { keepPreviousData: true, execute: scoped.length > 0 },
  );

  const parsed = parseSearch(searchText);
  const total = (data ?? []).reduce((n, s) => n + s.errors.length, 0);
  const lookupErrors = envData?.errors ?? [];

  return (
    <List
      isLoading={envLoading || isLoading}
      isShowingDetail={total > 0}
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      navigationTitle={props.root ? undefined : crumbs(props.env?.id ?? "All environments", `${total} import errors`)}
      searchBarPlaceholder="Filter…  env:prod  file text"
    >
      {envError && !scoped.length ? (
        <LoadErrorView
          title="Could Not List Environments"
          error={envError}
          onRetry={() => refreshEnvironments(revalidateEnvs)}
        />
      ) : lookupErrors.length === 0 ? (
        <List.EmptyView
          icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
          title={isLoading ? "Loading…" : `No import errors in ${scoped.length} environment(s)`}
        />
      ) : null}
      {lookupErrors.length > 0 && (
        <List.Section
          title="Environment Lookup Errors (Results Incomplete)"
          subtitle={`${scoped.length} environment(s) checked`}
        >
          {lookupErrors.map((e) => (
            <List.Item
              key={`${e.project}/${e.location}`}
              icon={{ source: Icon.Warning, tintColor: Color.Orange }}
              title={`${e.project} · ${e.location}`}
              subtitle={e.message}
              actions={
                <ActionPanel>
                  <Action
                    title="Retry Environment Scan"
                    icon={Icon.ArrowClockwise}
                    onAction={() => refreshEnvironments(revalidateEnvs)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      {(data ?? []).map(({ env, errors, error }) => {
        const items = errors.filter((e) =>
          matches(parsed, { env: [env.id, tierLabel(env)], project: [env.project], dag: [e.filename] }, [
            e.filename,
            e.stack_trace,
          ]),
        );
        if (!error && !items.length) return null;
        return (
          <List.Section
            key={envKey(env)}
            title={env.id}
            subtitle={`${items.length} · ${tierLabel(env)} · ${env.project}`}
          >
            {error && (
              <List.Item
                icon={{ source: Icon.Warning, tintColor: Color.Red }}
                title="Could not list import errors"
                subtitle={error}
                actions={
                  <ActionPanel>
                    <EnvironmentActions env={env} />
                  </ActionPanel>
                }
              />
            )}
            {items.map((ie) => {
              const trace = ie.stack_trace.split("\n").slice(-400).join("\n");
              const bucket = consoleDagsBucketUrl(env);
              return (
                <List.Item
                  key={ie.import_error_id}
                  icon={{ source: Icon.Bug, tintColor: Color.Red }}
                  title={ie.filename.split("/").pop() ?? ie.filename}
                  accessories={[
                    { tag: { value: env.id, color: tierColor(env) } },
                    { text: relativeTime(ie.timestamp) },
                  ]}
                  detail={
                    <List.Item.Detail
                      markdown={`**${errorMessage(ie.stack_trace)}**\n\n${codeBlock(trace, "python")}`}
                      metadata={
                        <List.Item.Detail.Metadata>
                          <List.Item.Detail.Metadata.Label title="Environment" text={env.id} />
                          <List.Item.Detail.Metadata.Label title="File" text={ie.filename} />
                          <List.Item.Detail.Metadata.Label title="Seen" text={formatTimestamp(ie.timestamp)} />
                        </List.Item.Detail.Metadata>
                      }
                    />
                  }
                  actions={
                    <ActionPanel>
                      <Action.CopyToClipboard title="Copy Stack Trace" content={ie.stack_trace} />
                      <Action.CopyToClipboard title="Copy Filename" content={ie.filename} />
                      <Action.OpenInBrowser
                        title="Open Airflow UI"
                        url={`${env.airflowUri}/home`}
                        shortcut={hotkey(["cmd"], "o")}
                      />
                      {bucket && <Action.OpenInBrowser title="Open DAGs Bucket" url={bucket} />}
                      <NavigateSection>
                        <Action.Push title={`DAGs in ${env.id}`} icon={Icon.List} target={<DagList env={env} />} />
                        <Action
                          title="Refresh"
                          icon={Icon.ArrowClockwise}
                          shortcut={refreshShortcut}
                          onAction={revalidate}
                        />
                      </NavigateSection>
                      <EnvironmentActions env={env} />
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        );
      })}
    </List>
  );
}
