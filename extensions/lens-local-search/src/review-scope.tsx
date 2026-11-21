import {
  Action,
  ActionPanel,
  Icon,
  List,
  LaunchType,
  launchCommand,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { basename, dirname } from "node:path";
import { readConfiguration } from "./settings";
import { readScope, restoreScope, type ScopeReport } from "./scope";
import { escapeMarkdown } from "./preview";
import type { Configuration } from "./backend";

export default function ReviewScope() {
  const [config, setConfig] = useState<Configuration>();
  const [report, setReport] = useState<ScopeReport>();
  const [error, setError] = useState<string>();
  const [version, setVersion] = useState(0);
  useEffect(() => {
    readConfiguration()
      .then((config) => {
        setConfig(config);
        setReport(readScope(config));
      })
      .catch(() =>
        setError(
          "Unable to read exclusions. Your files have not been changed.",
        ),
      );
  }, [version]);
  return (
    <List isLoading={!report && !error} isShowingDetail>
      <List.EmptyView
        title={error ?? "No Automatic Exclusions Yet"}
        description="Lens compares project copies during index updates. Only confident cases are excluded; files are never deleted."
        actions={
          <ActionPanel>
            <Action
              title="Update Search Index"
              onAction={() =>
                launchCommand({
                  name: "index-files",
                  type: LaunchType.UserInitiated,
                })
              }
            />
          </ActionPanel>
        }
      />
      {report && error && (
        <List.Item title={error} icon={Icon.ExclamationMark} />
      )}
      {report?.groups.map((group) => {
        const restored = report.restored.includes(group.root);
        const title =
          basename(group.root) === "tree"
            ? basename(dirname(group.root))
            : basename(group.root);
        const status = group.uncertain
          ? "Needs review · Kept indexed"
          : restored
            ? "Included in search scope"
            : `${group.files.length} unchanged files excluded`;
        return (
          <List.Item
            key={group.root}
            title={title}
            subtitle={status}
            icon={
              group.uncertain
                ? Icon.QuestionMarkCircle
                : restored
                  ? Icon.Eye
                  : Icon.EyeDisabled
            }
            detail={
              <List.Item.Detail
                markdown={`## ${escapeMarkdown(title)}\n\n${escapeMarkdown(group.reason)}\n\n${escapeMarkdown(group.root)}\n\n${group.canonical ? `Canonical project: ${escapeMarkdown(group.canonical)}\n\n` : ""}${status}. Files remain on disk.\n\nChanged and new files are kept. Restored files return during the next index update.`}
              />
            }
            actions={
              <ActionPanel>
                {!group.uncertain && (
                  <Action
                    title={
                      restored
                        ? "Resume Automatic Exclusion"
                        : "Restore to Index"
                    }
                    icon={Icon.ArrowCounterClockwise}
                    onAction={async () => {
                      try {
                        restoreScope(config!, group.root, !restored);
                        setVersion((v) => v + 1);
                        await launchCommand({
                          name: "index-files",
                          type: LaunchType.UserInitiated,
                        });
                      } catch {
                        setError(
                          "Unable to update this exclusion. Try again after indexing finishes.",
                        );
                      }
                    }}
                  />
                )}
                <Action.ShowInFinder path={group.root} />
                <Action.CopyToClipboard
                  title="Copy Folder Path"
                  content={group.root}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
