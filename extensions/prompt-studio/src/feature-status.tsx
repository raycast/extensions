import {
  Action,
  ActionPanel,
  Color,
  getPreferenceValues,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import {
  FeatureStatus as Status,
  getFeatureStatus,
  loadFeatureStatuses,
} from "./core/features";
import {
  listPrompts,
  rebuildPromptSearchIndex,
  resolvePromptDirectory,
} from "./core/prompt-store";
import { inspectQmd, rebuildQmd, type QmdHealth } from "./core/qmd-search";
import {
  defaultSearchIndexPath,
  inspectSearchIndex,
  type SearchIndexHealth,
} from "./core/search-index";

interface Preferences {
  libraryDirectory?: string;
  qmdExecutable?: string;
}

export default function FeatureStatus() {
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [indexHealth, setIndexHealth] = useState<SearchIndexHealth>();
  const [qmdHealth, setQmdHealth] = useState<QmdHealth>();
  const [error, setError] = useState<string>();
  const preferences = getPreferenceValues<Preferences>();

  const load = useCallback(async () => {
    setError(undefined);
    try {
      const nextStatuses = await loadFeatureStatuses();
      setStatuses(nextStatuses);
      if (
        getFeatureStatus(nextStatuses, "sqlite-search").effectiveState ===
        "active"
      ) {
        const directory = resolvePromptDirectory(preferences.libraryDirectory);
        const library = await listPrompts(directory);
        setIndexHealth(
          inspectSearchIndex(defaultSearchIndexPath(), library.records),
        );
        if (
          getFeatureStatus(nextStatuses, "qmd-discovery").effectiveState !==
          "disabled"
        ) {
          setQmdHealth(
            await inspectQmd(
              directory,
              library.records,
              preferences.qmdExecutable,
            ),
          );
        } else {
          setQmdHealth(undefined);
        }
      } else {
        setIndexHealth(undefined);
        setQmdHealth(undefined);
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : String(loadError),
      );
    }
  }, [preferences.libraryDirectory, preferences.qmdExecutable]);

  useEffect(() => {
    void load();
  }, [load]);

  async function rebuildIndex() {
    const health = await rebuildPromptSearchIndex(
      resolvePromptDirectory(preferences.libraryDirectory),
    );
    setIndexHealth(health);
    await showToast(
      Toast.Style.Success,
      "Search Index Rebuilt",
      `${health.recordCount} prompt${health.recordCount === 1 ? "" : "s"} indexed`,
    );
  }

  async function rebuildMeaningIndex() {
    const directory = resolvePromptDirectory(preferences.libraryDirectory);
    const library = await listPrompts(directory);
    const health = await rebuildQmd(
      directory,
      library.records,
      preferences.qmdExecutable,
    );
    setQmdHealth(health);
    await showToast(
      Toast.Style.Success,
      "Meaning Search Refreshed",
      `${health.vectorCount} prompt${health.vectorCount === 1 ? "" : "s"} embedded`,
    );
  }

  return (
    <List
      isLoading={!error && statuses.length === 0}
      isShowingDetail
      searchBarPlaceholder="Search capabilities…"
    >
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Configuration Error"
          description={error}
        />
      ) : null}
      {(["active", "preview", "disabled"] as const).map((state) => {
        const items = statuses.filter(
          (status) => status.effectiveState === state,
        );
        return items.length > 0 ? (
          <List.Section
            key={state}
            title={title(state)}
            subtitle={`${items.length}`}
          >
            {items.map((status) => (
              <List.Item
                key={status.id}
                icon={stateIcon(status.effectiveState)}
                title={status.title}
                keywords={[
                  status.id,
                  status.description,
                  `activation ${status.activationOrder}`,
                ]}
                detail={
                  <StatusDetail
                    status={status}
                    indexHealth={
                      status.id === "sqlite-search" ? indexHealth : undefined
                    }
                    qmdHealth={
                      status.id === "qmd-discovery" ? qmdHealth : undefined
                    }
                  />
                }
                actions={
                  <ActionPanel>
                    {status.id === "sqlite-search" &&
                    status.effectiveState === "active" ? (
                      <Action
                        title="Rebuild SQLite Search Index"
                        icon={Icon.ArrowClockwise}
                        onAction={rebuildIndex}
                      />
                    ) : null}
                    {status.id === "qmd-discovery" &&
                    status.effectiveState !== "disabled" ? (
                      <Action
                        title="Refresh QMD Meaning Index"
                        icon={Icon.ArrowClockwise}
                        onAction={rebuildMeaningIndex}
                      />
                    ) : null}
                    <Action.CopyToClipboard
                      title="Copy Status"
                      content={statusText(status)}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ) : null;
      })}
    </List>
  );
}

function StatusDetail({
  status,
  indexHealth,
  qmdHealth,
}: {
  status: Status;
  indexHealth: SearchIndexHealth | undefined;
  qmdHealth: QmdHealth | undefined;
}) {
  const healthText = indexHealth
    ? `\n\n## Index Health\n\n${indexHealth.message}`
    : "";
  const qmdHealthText = qmdHealth
    ? `\n\n## Meaning Search Health\n\n${qmdHealth.message}`
    : "";
  return (
    <List.Item.Detail
      markdown={`# ${status.title}\n\n${status.description}\n\n${status.reason ? `> ${status.reason}` : ""}${healthText}${qmdHealthText}`}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="State"
            text={title(status.effectiveState)}
          />
          <List.Item.Detail.Metadata.Label
            title="Sequence"
            text={
              status.activationOrder === 0
                ? "Foundation"
                : `Activation ${status.activationOrder}`
            }
          />
          {status.requestedState !== status.effectiveState ? (
            <List.Item.Detail.Metadata.Label
              title="Requested"
              text={title(status.requestedState)}
            />
          ) : null}
          {status.verification ? (
            <List.Item.Detail.Metadata.Label
              title="Verified"
              text={new Date(status.verification.checkedAt).toLocaleString()}
            />
          ) : null}
          {indexHealth ? (
            <>
              <List.Item.Detail.Metadata.Label
                title="Index"
                text={title(indexHealth.status)}
              />
              <List.Item.Detail.Metadata.Label
                title="Records"
                text={`${indexHealth.recordCount}`}
              />
              {indexHealth.lastUpdated ? (
                <List.Item.Detail.Metadata.Label
                  title="Index Updated"
                  text={new Date(indexHealth.lastUpdated).toLocaleString()}
                />
              ) : null}
              <List.Item.Detail.Metadata.Label
                title="Database"
                text={indexHealth.path}
              />
            </>
          ) : null}
          {qmdHealth ? (
            <>
              <List.Item.Detail.Metadata.Label
                title="QMD"
                text={title(qmdHealth.state)}
              />
              <List.Item.Detail.Metadata.Label
                title="Documents"
                text={`${qmdHealth.documentCount}`}
              />
              <List.Item.Detail.Metadata.Label
                title="Vectors"
                text={`${qmdHealth.vectorCount}`}
              />
              {qmdHealth.version ? (
                <List.Item.Detail.Metadata.Label
                  title="QMD Version"
                  text={qmdHealth.version}
                />
              ) : null}
              {qmdHealth.lastUpdated ? (
                <List.Item.Detail.Metadata.Label
                  title="Meaning Index Updated"
                  text={new Date(qmdHealth.lastUpdated).toLocaleString()}
                />
              ) : null}
              <List.Item.Detail.Metadata.Label
                title="Executable"
                text={qmdHealth.executable}
              />
            </>
          ) : null}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function stateIcon(state: Status["effectiveState"]) {
  if (state === "active")
    return { source: Icon.CheckCircle, tintColor: Color.Green };
  if (state === "preview") return { source: Icon.Eye, tintColor: Color.Orange };
  return { source: Icon.CircleDisabled, tintColor: Color.SecondaryText };
}

function title(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function statusText(status: Status): string {
  const sequence =
    status.activationOrder === 0
      ? "Foundation"
      : `Activation ${status.activationOrder}`;
  return `${status.title}: ${title(status.effectiveState)} (${sequence})${status.reason ? ` — ${status.reason}` : ""}`;
}
