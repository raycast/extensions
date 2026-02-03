import path from "node:path";
import { Color, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { type FC, memo, useMemo, useRef } from "react";
import { useConfig } from "../../hooks";
import type { Config, GrepEntry } from "../../types";
import {
  buildContextMarkdown,
  formatMatchCount,
  getFileContext,
  groupEntriesByFile,
} from "../../utils";
import { GrepResultActionPanel } from "../actions";

type GrepResultItemProps = {
  entry: GrepEntry;
  config: Config;
  onConfigChange: (config: Partial<Config>) => void;
  isSelected: boolean;
};

const GrepResultItem = memo<GrepResultItemProps>(
  ({ entry, config, onConfigChange, isSelected }) => {
    const abortControllerRef = useRef<AbortController | null>(null);
    const { data: context } = usePromise(getFileContext, [entry.path, entry.offset], {
      abortable: abortControllerRef,
      execute: isSelected,
    });

    const markdown = context ? buildContextMarkdown(entry, context) : "Loading...";

    return (
      <List.Item
        id={String(entry.id)}
        icon={Icon.Document}
        title={entry.content}
        detail={
          <List.Item.Detail
            markdown={markdown}
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label
                  title="Line"
                  icon={{ source: Icon.Wand, tintColor: Color.Green }}
                  text={{ value: String(entry.line) }}
                />
                <List.Item.Detail.Metadata.Label
                  title="File"
                  text={{ value: path.basename(entry.path) }}
                  icon={{ fileIcon: entry.path, tintColor: Color.Red }}
                />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Link
                  title="Open"
                  target={`file://${entry.path}`}
                  text={entry.path}
                />
              </List.Item.Detail.Metadata>
            }
          />
        }
        actions={
          <GrepResultActionPanel entry={entry} config={config} onConfigChange={onConfigChange} />
        }
      />
    );
  },
  (prev, next) =>
    prev.entry.id === next.entry.id &&
    prev.isSelected === next.isSelected &&
    prev.config === next.config,
);

type GrepResultsListProps = {
  entries: GrepEntry[];
  selectedId: number | null;
};

export const GrepResultsList: FC<GrepResultsListProps> = ({ entries, selectedId }) => {
  const { config, updateConfig } = useConfig();
  const groupedEntries = useMemo(() => groupEntriesByFile(entries), [entries]);

  return (
    <>
      {Array.from(groupedEntries.entries()).map(([filePath, fileEntries]) => (
        <List.Section
          key={filePath}
          title={path.basename(filePath)}
          subtitle={formatMatchCount(fileEntries.length)}
        >
          {fileEntries.map((entry) => (
            <GrepResultItem
              key={entry.id}
              entry={entry}
              config={config}
              onConfigChange={updateConfig}
              isSelected={entry.id === selectedId}
            />
          ))}
        </List.Section>
      ))}
    </>
  );
};
