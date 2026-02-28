import { memo, useEffect, useState } from "react";

import { Action, ActionPanel, Icon, List } from "@raycast/api";

import { Details } from "@/components/Details";
import { getBaselineBadge, getBrowserIcon, getCompat, readCachedCompat } from "@/lib/compat";
import { getMdnKindIcon, getMdnKindLabel } from "@/lib/mdn";
import type { CompatMatch, Result } from "@/types";

type ResultItemProps = {
  result: Result;
  locale: string;
  preferredAction: "preview" | "open";
  selected: boolean;
  onReloadSearchResults: () => void;
};

function getMetadata(result: Result, compat: CompatMatch | null | undefined) {
  const baselineBadge = compat ? getBaselineBadge(compat.baseline) : undefined;

  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label
        title={result.title}
        text={result.kind !== "guide" ? getMdnKindLabel(result.kind) : undefined}
        icon={result.kind !== "guide" ? getMdnKindIcon(result.kind) : undefined}
      />
      <List.Item.Detail.Metadata.Link title="MDN" text="Open in Browser" target={result.url} />
      {compat === undefined ? (
        <>
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Compatibility" text="Loading compatibility data..." />
        </>
      ) : compat === null ? (
        <>
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Compatibility" text="No browser compatibility data found" />
        </>
      ) : (
        <>
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Baseline"
            text={baselineBadge?.text ?? "No Baseline status"}
            icon={baselineBadge?.icon}
          />
          {compat.baselineDate ? (
            <List.Item.Detail.Metadata.Label title="Baseline Date" text={compat.baselineDate} />
          ) : null}
          <List.Item.Detail.Metadata.Label title="Compat Key" text={compat.compatKey} />
          <List.Item.Detail.Metadata.Separator />
          {compat.browsers.length ? (
            compat.browsers.map((row) => (
              <List.Item.Detail.Metadata.Label
                key={`${result.id}-${row.browserId}`}
                title={row.browserName}
                text={row.support}
                icon={row.icon ?? getBrowserIcon(row.browserId)}
              />
            ))
          ) : (
            <List.Item.Detail.Metadata.Label title="Support" text="No per-browser support matrix available" />
          )}
        </>
      )}
    </List.Item.Detail.Metadata>
  );
}

function ResultItemComponent({ result, locale, preferredAction, selected, onReloadSearchResults }: ResultItemProps) {
  const [compat, setCompat] = useState<CompatMatch | null | undefined>(undefined);

  useEffect(() => {
    if (!selected || compat !== undefined) {
      return;
    }

    const cached = readCachedCompat(result.path);
    if (cached !== undefined) {
      setCompat(cached);
      return;
    }

    let cancelled = false;

    const run = async () => {
      const resolved = await getCompat(result.path);

      if (cancelled) {
        return;
      }

      setCompat(resolved ?? null);
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [compat, result.path, selected]);

  return (
    <List.Item
      id={result.id}
      title={result.title}
      icon={getMdnKindIcon(result.kind)}
      detail={selected ? <List.Item.Detail metadata={getMetadata(result, compat)} /> : undefined}
      actions={
        selected ? (
          <ActionPanel>
            {preferredAction === "open" ? (
              <>
                <Action.OpenInBrowser title="Open in Browser" url={result.url} />
                <Action.Push
                  icon={Icon.Document}
                  title="Read Document"
                  target={<Details result={result} locale={locale} />}
                />
              </>
            ) : (
              <>
                <Action.Push
                  icon={Icon.Document}
                  title="Read Document"
                  target={<Details result={result} locale={locale} />}
                />
                <Action.OpenInBrowser title="Open in Browser" url={result.url} />
              </>
            )}
            <Action.CopyToClipboard title="Copy URL" content={result.url} shortcut={{ modifiers: ["cmd"], key: "." }} />
            <Action
              title="Reload Search Results"
              icon={Icon.ArrowClockwise}
              onAction={onReloadSearchResults}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}

function arePropsEqual(previous: ResultItemProps, next: ResultItemProps): boolean {
  return (
    previous.result.id === next.result.id &&
    previous.selected === next.selected &&
    previous.locale === next.locale &&
    previous.preferredAction === next.preferredAction &&
    previous.onReloadSearchResults === next.onReloadSearchResults
  );
}

export const ResultItem = memo(ResultItemComponent, arePropsEqual);
