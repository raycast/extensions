import * as fs from "fs";
import { List } from "@raycast/api";
import { useEffect, useState } from "react";
import { UpdateInfo } from "../utils/types";
import { SOURCE_META } from "../utils/source-meta";
import {
  appBundleSize,
  buildAppDetailMarkdown,
  formatBytes,
  formatDate,
} from "../utils/detail";
import { hostnameOf } from "../utils/format";
import { fetchReleaseNotesForUrl } from "../utils/sources/github";

/** True if `info` has no inline notes but points at a GitHub URL we can fetch. */
function canFetchGithubNotes(info: UpdateInfo): boolean {
  if (
    info.releaseNotesMarkdown ||
    info.releaseNotesHtml ||
    info.releaseNotesText
  ) {
    return false;
  }
  const url = info.releaseNotesUrl ?? "";
  return /github\.com/i.test(url);
}

/**
 * The app detail pane. Extracted from the main command so the file shrinks and
 * so it can do its own async work: Homebrew (and other) apps often carry no
 * release notes, but a great many are GitHub-hosted — so when the pane opens we
 * lazily fetch the latest GitHub release's changelog and fold it in. Until that
 * resolves (or if it can't), buildAppDetailMarkdown's graceful fallback shows.
 */
export default function AppDetail({ info }: { info: UpdateInfo }) {
  const [resolved, setResolved] = useState<UpdateInfo>(info);

  useEffect(() => {
    setResolved(info);
    if (!canFetchGithubNotes(info)) return;
    let cancelled = false;
    fetchReleaseNotesForUrl(info.releaseNotesUrl!)
      .then((res) => {
        if (!cancelled && res) {
          setResolved({
            ...info,
            releaseNotesMarkdown: res.markdown,
            releaseNotesUrl: res.htmlUrl ?? info.releaseNotesUrl,
          });
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [info]);

  const meta = SOURCE_META[resolved.source];
  let installedSize = "";
  let installedDate = "";
  try {
    installedSize = formatBytes(appBundleSize(resolved.app.appPath));
    installedDate = formatDate(fs.statSync(resolved.app.appPath).mtimeMs);
  } catch {
    // unreadable — show "—" below
  }

  return (
    <List.Item.Detail
      markdown={buildAppDetailMarkdown(resolved)}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Installed version"
            text={resolved.app.version}
          />
          <List.Item.Detail.Metadata.Label
            title="Latest version"
            text={resolved.latestVersion}
          />
          {resolved.app.buildNumber &&
            resolved.app.buildNumber !== resolved.app.version && (
              <List.Item.Detail.Metadata.Label
                title="Build"
                text={resolved.app.buildNumber}
              />
            )}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.TagList title="Source">
            <List.Item.Detail.Metadata.TagList.Item
              text={meta.label}
              color={meta.color}
              icon={meta.icon}
            />
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Label
            title="Bundle ID"
            text={resolved.app.bundleId || "—"}
          />
          <List.Item.Detail.Metadata.Label
            title="Size"
            text={installedSize || "—"}
          />
          <List.Item.Detail.Metadata.Label
            title="Last modified"
            text={installedDate || "—"}
          />
          {resolved.releaseNotesUrl && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Link
                title="Release notes"
                target={resolved.releaseNotesUrl}
                text={hostnameOf(resolved.releaseNotesUrl)}
              />
            </>
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
