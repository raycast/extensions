import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import { showFailureToast, useCachedState, useFrecencySorting } from "@raycast/utils";
import { useMemo, useState } from "react";
import { analyzeDocument, DocumentInfo, operationLabel, OperationType } from "../lib/document";
import { faIcon } from "../lib/icons";
import { codeBlock } from "../lib/request";
import { Shortcuts } from "../lib/shortcuts";
import { deleteQuery, duplicateQuery, useStore } from "../lib/store";
import { GraphQLEnvironment, SavedQuery } from "../lib/types";
import { EnvironmentForm } from "./EnvironmentForm";
import { EnvironmentList } from "./EnvironmentList";
import { QueryForm } from "./QueryForm";
import { useRunQuery } from "./run";

const ALL = "__all";
const UNASSIGNED = "__none";

const OPERATION_COLORS: Record<OperationType, Color> = {
  query: Color.Green,
  mutation: Color.Orange,
  subscription: Color.Purple,
};

function variableNames(info: DocumentInfo): string[] {
  return [...new Set(info.operations.flatMap((operation) => operation.variables.map((variable) => variable.name)))];
}

export function QueryList() {
  const { queries, environments, isLoading } = useStore();
  const [filter, setFilter] = useState(ALL);
  const [showingDetail, setShowingDetail] = useCachedState("queries-show-detail", false);
  const runQuery = useRunQuery();

  const envById = useMemo(() => new Map(environments.map((env) => [env.id, env])), [environments]);
  const hasUnassigned = queries.some((query) => !query.environmentId || !envById.has(query.environmentId));

  const filtered = useMemo(() => {
    if (filter === ALL) return queries;
    if (filter === UNASSIGNED)
      return queries.filter((query) => !query.environmentId || !envById.has(query.environmentId));
    return queries.filter((query) => query.environmentId === filter);
  }, [queries, filter, envById]);

  const { data: sorted, visitItem } = useFrecencySorting(filtered, {
    namespace: "queries",
    sortUnvisited: (a, b) => a.name.localeCompare(b.name),
  });

  const defaultEnvironmentId = envById.has(filter) ? filter : undefined;

  async function handleRun(query: SavedQuery, env: GraphQLEnvironment | undefined) {
    if (await runQuery(query, env)) await visitItem(query);
  }

  async function handleDuplicate(query: SavedQuery) {
    let copy: SavedQuery | undefined;
    try {
      copy = await duplicateQuery(query.id);
    } catch (error) {
      await showFailureToast(error, { title: "Could not duplicate query" });
      return;
    }
    if (copy) await showToast({ style: Toast.Style.Success, title: "Query duplicated", message: copy.name });
  }

  async function handleDelete(query: SavedQuery) {
    const confirmed = await confirmAlert({
      title: `Delete "${query.name}"?`,
      message: "This cannot be undone.",
      icon: Icon.Trash,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    try {
      await deleteQuery(query.id);
    } catch (error) {
      await showFailureToast(error, { title: "Could not delete query" });
      return;
    }
    await showToast({ style: Toast.Style.Success, title: "Query deleted" });
  }

  const createQueryAction = (
    <Action.Push
      title="Create Query"
      icon={Icon.Plus}
      shortcut={Shortcuts.New}
      target={<QueryForm draft={{ environmentId: defaultEnvironmentId }} />}
    />
  );
  const manageEnvironmentsAction = (
    <Action.Push
      title="Manage Environments"
      icon={Icon.Globe}
      shortcut={Shortcuts.Environments}
      target={<EnvironmentList />}
    />
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showingDetail && sorted.length > 0}
      searchBarPlaceholder="Search queries…"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by environment" storeValue onChange={setFilter}>
          <List.Dropdown.Item value={ALL} title="All Environments" icon={Icon.AppWindowGrid3x3} />
          <List.Dropdown.Section>
            {environments.map((env) => (
              <List.Dropdown.Item key={env.id} value={env.id} title={env.name} icon={Icon.Globe} />
            ))}
            {hasUnassigned && <List.Dropdown.Item value={UNASSIGNED} title="No Environment" icon={Icon.QuestionMark} />}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {environments.length === 0 ? (
        <List.EmptyView
          icon={Icon.Globe}
          title="Create an environment first"
          description="An environment is the GraphQL endpoint and headers (e.g. Authorization) your queries run against."
          actions={
            <ActionPanel>
              <Action.Push title="Create Environment" icon={Icon.Plus} target={<EnvironmentForm />} />
              {createQueryAction}
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          icon={Icon.Code}
          title={queries.length === 0 ? "No queries yet" : "No matching queries"}
          description={queries.length === 0 ? "Press ↵ to save your first GraphQL query." : undefined}
          actions={
            <ActionPanel>
              {createQueryAction}
              {manageEnvironmentsAction}
            </ActionPanel>
          }
        />
      )}

      {sorted.map((query) => {
        const env = query.environmentId ? envById.get(query.environmentId) : undefined;
        const info = analyzeDocument(query.query);
        const variables = variableNames(info);
        const operations = info.operations.map(operationLabel);

        return (
          <List.Item
            key={query.id}
            id={query.id}
            icon={faIcon(query.icon, query.iconColor)}
            title={query.name}
            subtitle={showingDetail ? undefined : operations.join(", ")}
            keywords={[env?.name ?? "", ...info.operations.map((operation) => operation.name ?? "")].filter(Boolean)}
            accessories={
              showingDetail
                ? undefined
                : [
                    ...(info.error
                      ? [{ icon: { source: Icon.Warning, tintColor: Color.Orange }, tooltip: info.error }]
                      : []),
                    ...(variables.length
                      ? [
                          {
                            text: `${variables.length} ${variables.length === 1 ? "variable" : "variables"}`,
                            tooltip: variables.map((name) => `$${name}`).join(", "),
                          },
                        ]
                      : []),
                    { tag: { value: env?.name ?? "No environment", color: env ? Color.Blue : Color.Red } },
                  ]
            }
            detail={<QueryDetail query={query} env={env} info={info} />}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action title="Run Query" icon={Icon.Play} onAction={() => handleRun(query, env)} />
                  {environments.length > 1 && (
                    <ActionPanel.Submenu title="Run in Environment…" icon={Icon.Globe} shortcut={Shortcuts.RunIn}>
                      {environments.map((item) => (
                        <Action
                          key={item.id}
                          title={item.name}
                          icon={item.id === env?.id ? Icon.CheckCircle : Icon.Circle}
                          onAction={() => handleRun(query, item)}
                        />
                      ))}
                    </ActionPanel.Submenu>
                  )}
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.Push
                    title="Edit Query"
                    icon={Icon.Pencil}
                    shortcut={Shortcuts.Edit}
                    target={<QueryForm query={query} />}
                  />
                  {createQueryAction}
                  <Action
                    title="Duplicate Query"
                    icon={Icon.CopyClipboard}
                    shortcut={Shortcuts.Duplicate}
                    onAction={() => handleDuplicate(query)}
                  />
                  <Action
                    title={showingDetail ? "Hide Details" : "Show Details"}
                    icon={Icon.Sidebar}
                    shortcut={Shortcuts.ToggleDetail}
                    onAction={() => setShowingDetail((value) => !value)}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.CopyToClipboard title="Copy Query" content={query.query} shortcut={Shortcuts.Copy} />
                  {manageEnvironmentsAction}
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Delete Query"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={Shortcuts.Remove}
                    onAction={() => handleDelete(query)}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function QueryDetail({ query, env, info }: { query: SavedQuery; env?: GraphQLEnvironment; info: DocumentInfo }) {
  return (
    <List.Item.Detail
      markdown={codeBlock("graphql", query.query.trim())}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Environment"
            text={env ? env.name : { value: "Not set", color: Color.Red }}
            icon={Icon.Globe}
          />
          {env && <List.Item.Detail.Metadata.Label title="Endpoint" text={env.url} />}
          {info.error ? (
            <List.Item.Detail.Metadata.Label title="Error" text={{ value: info.error, color: Color.Orange }} />
          ) : (
            <List.Item.Detail.Metadata.TagList title="Operations">
              {info.operations.map((operation, index) => (
                <List.Item.Detail.Metadata.TagList.Item
                  key={`${operation.name ?? ""}-${index}`}
                  text={operationLabel(operation)}
                  color={OPERATION_COLORS[operation.type]}
                />
              ))}
            </List.Item.Detail.Metadata.TagList>
          )}
          {info.operations.some((operation) => operation.variables.length > 0) && (
            <List.Item.Detail.Metadata.Separator />
          )}
          {info.operations.flatMap((operation) =>
            operation.variables.map((variable) => (
              <List.Item.Detail.Metadata.Label
                key={`${operation.name ?? ""}-${variable.name}`}
                title={`$${variable.name}`}
                text={`${variable.type}${variable.kind === "json" ? "  ·  JSON editor" : ""}`}
              />
            )),
          )}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Updated" text={new Date(query.updatedAt).toLocaleString()} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}
