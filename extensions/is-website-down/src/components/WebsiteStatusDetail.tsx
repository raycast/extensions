import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";

import {
  ServiceResult,
  ServiceStatus,
  WebsiteTarget,
  checkWebsite,
  getOverallStatus,
  normalizeWebsiteInput,
} from "../lib/website-status";
import { useEffect, useMemo, useState } from "react";

interface WebsiteStatusDetailProps {
  input: string;
  onReset?: () => void;
}

const STATUS_META: Record<ServiceStatus, { label: string; color: Color }> = {
  up: { label: "UP", color: Color.Green },
  down: { label: "DOWN", color: Color.Red },
  degraded: { label: "DEGRADED", color: Color.Orange },
  unknown: { label: "UNKNOWN", color: Color.Yellow },
  error: { label: "ERROR", color: Color.Red },
};

export function WebsiteStatusDetail({
  input,
  onReset,
}: WebsiteStatusDetailProps) {
  const [target, setTarget] = useState<WebsiteTarget>();
  const [results, setResults] = useState<ServiceResult[]>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    async function runCheck() {
      setIsLoading(true);
      setResults(undefined);
      setError(undefined);

      try {
        const normalizedTarget = normalizeWebsiteInput(input);
        setTarget(normalizedTarget);
        const nextResults = await checkWebsite(normalizedTarget);

        if (!isCancelled) {
          setResults(nextResults);
        }
      } catch (caughtError) {
        if (!isCancelled) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Could not check this website.",
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    runCheck();

    return () => {
      isCancelled = true;
    };
  }, [input]);

  const copySummary = useMemo(() => {
    if (!target || !results) {
      return "";
    }

    return [
      `Website: ${target.domain}`,
      `Overall: ${STATUS_META[getOverallStatus(results)].label}`,
      ...results.map(
        (result) =>
          `${result.serviceName}: ${STATUS_META[result.status].label} - ${result.summary}`,
      ),
    ].join("\n");
  }, [results, target]);

  if (error) {
    return (
      <List navigationTitle="Website Status">
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Could Not Check Website"
          description={`${error} Use a public domain like example.com.`}
          actions={
            <SharedActions copySummary={copySummary} onReset={onReset} />
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Website Status"
      searchBarPlaceholder="Filter results"
    >
      {target && results ? (
        <StatusResults
          target={target}
          results={results}
          copySummary={copySummary}
          onReset={onReset}
        />
      ) : (
        <List.EmptyView
          title={target ? `Checking ${target.domain}` : "Checking Website"}
          description="Checking both services..."
        />
      )}
    </List>
  );
}

function StatusResults({
  target,
  results,
  copySummary,
  onReset,
}: {
  target: WebsiteTarget;
  results: ServiceResult[];
  copySummary: string;
  onReset?: () => void;
}) {
  const overallStatus = getOverallStatus(results);
  const overallMeta = STATUS_META[overallStatus];

  return (
    <>
      <List.Section title="Summary" subtitle={target.domain}>
        <List.Item
          id="overall"
          title={target.domain}
          subtitle={`Summary of ${results.length} services`}
          icon={{ source: Icon.Circle, tintColor: overallMeta.color }}
          accessories={[
            {
              tag: { value: overallMeta.label, color: overallMeta.color },
              tooltip: "Summary status",
            },
          ]}
          actions={
            <SharedActions copySummary={copySummary} onReset={onReset} />
          }
        />
      </List.Section>

      <List.Section title="Services">
        {results.map((result) => {
          const statusMeta = STATUS_META[result.status];

          return (
            <List.Item
              key={result.id}
              id={result.id}
              title={result.serviceName}
              subtitle={result.summary}
              icon={{ source: Icon.Circle, tintColor: statusMeta.color }}
              accessories={[
                {
                  tag: { value: statusMeta.label, color: statusMeta.color },
                  tooltip: `${result.serviceName} status`,
                },
              ]}
              actions={
                <SharedActions
                  result={result}
                  results={results}
                  copySummary={copySummary}
                  onReset={onReset}
                />
              }
            />
          );
        })}
      </List.Section>

      <List.Section title="Details">
        {results.flatMap((result) =>
          result.details.map((detail, index) => (
            <List.Item
              key={`${result.id}-${index}`}
              id={`${result.id}-${index}`}
              title={detail}
              subtitle={result.serviceName}
              accessories={[
                {
                  tag: {
                    value: STATUS_META[result.status].label,
                    color: STATUS_META[result.status].color,
                  },
                },
              ]}
              actions={
                <SharedActions
                  result={result}
                  results={results}
                  copySummary={copySummary}
                  onReset={onReset}
                />
              }
            />
          )),
        )}
      </List.Section>
    </>
  );
}

function SharedActions({
  result,
  results,
  copySummary,
  onReset,
}: {
  result?: ServiceResult;
  results?: ServiceResult[];
  copySummary?: string;
  onReset?: () => void;
}) {
  return (
    <ActionPanel>
      {result ? (
        <Action.OpenInBrowser
          title={`Open ${result.serviceName}`}
          url={result.sourceUrl}
        />
      ) : null}
      {onReset ? (
        <Action
          title="Check Another Website"
          icon={Icon.MagnifyingGlass}
          onAction={onReset}
        />
      ) : null}
      {copySummary ? (
        <Action.CopyToClipboard title="Copy Summary" content={copySummary} />
      ) : null}
      {results
        ?.filter((candidate) => candidate.id !== result?.id)
        .map((candidate) => (
          <Action.OpenInBrowser
            key={candidate.id}
            title={`Open ${candidate.serviceName}`}
            url={candidate.sourceUrl}
          />
        ))}
    </ActionPanel>
  );
}
