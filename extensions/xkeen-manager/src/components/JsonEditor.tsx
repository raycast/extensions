/* eslint-disable @typescript-eslint/no-explicit-any */

import { Action, ActionPanel, Detail, Form, Icon, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { readRemoteFile, safeWriteRemoteFile, listRemoteBackups, restoreRemoteBackup } from "../lib/files";
import {
  tryParseJson,
  validateXrayJson,
  isRoutingPath,
  isOutboundsPath,
  countChangedLines,
  extractOutboundTags,
} from "../lib/json";
import { runRemote } from "../lib/ssh";
import { loadStartupData } from "../lib/health";
import { getPaths, shQuote, basenameFromPath, mdCode } from "../lib/utils";

export function JsonEditor(props: {
  title: string;
  path: string;
  onAfterSave?: (result?: { restarted: boolean }) => void;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [content, setContent] = useState<string>("");
  const [originalContent, setOriginalContent] = useState<string>("");
  const { configDir, profilesDir } = getPaths();

  async function load() {
    setIsLoading(true);
    try {
      const txt = await readRemoteFile(props.path);
      // Show raw text with comments preserved — do NOT parse/re-stringify
      setContent(txt);
      setOriginalContent(txt);
    } catch (e: any) {
      setContent(e?.message ?? String(e));
      setOriginalContent("");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => void load(), []);

  async function rollbackLatestBackup() {
    setIsLoading(true);
    try {
      const backups = await listRemoteBackups(props.path, 1);
      if (!backups.length) {
        await showToast({ style: Toast.Style.Failure, title: "No backups found" });
        return;
      }
      await restoreRemoteBackup(props.path, backups[0]);
      await runRemote("xkeen -restart");
      await showToast({
        style: Toast.Style.Success,
        title: "Rollback complete",
        message: basenameFromPath(backups[0]),
      });
      props.onAfterSave?.({ restarted: true });
      await load();
    } catch (e: any) {
      await showToast({ style: Toast.Style.Failure, title: "Rollback failed", message: e?.message ?? String(e) });
    } finally {
      setIsLoading(false);
    }
  }

  async function saveContent(rawContent: string, restartAfterWrite: boolean) {
    // Validate by stripping comments and parsing — but write the raw text with comments intact
    const parsed = tryParseJson(rawContent);
    if (!parsed.ok) {
      await showToast({ style: Toast.Style.Failure, title: "Invalid JSON", message: parsed.error.slice(0, 160) });
      return;
    }
    let knownOutboundTags: string[] | undefined;
    if (isRoutingPath(props.path)) {
      try {
        const outboundsText = await readRemoteFile(`${configDir}/04_outbounds.json`);
        knownOutboundTags = extractOutboundTags(outboundsText);
      } catch {
        // Outbounds file unreadable — validate without tag-awareness rather
        // than blocking the save.
        knownOutboundTags = undefined;
      }
    }

    const errs = validateXrayJson(props.path, parsed.value, knownOutboundTags);
    if (errs.length) {
      await showToast({ style: Toast.Style.Failure, title: "Validation failed", message: errs.slice(0, 2).join("; ") });
      return;
    }

    await showToast({
      style: Toast.Style.Animated,
      title: restartAfterWrite ? `Safe applying ${props.title}…` : `Saving ${props.title}…`,
    });

    try {
      if (restartAfterWrite) {
        const preflight = await loadStartupData();
        if (!preflight.optMounted || !preflight.xkeenAvailable) {
          throw new Error("Preflight failed: /opt or xkeen unavailable");
        }
      }

      // Write raw content WITH comments — not re-stringified
      const { backupPath } = await safeWriteRemoteFile(props.path, rawContent, {
        backupTag: isRoutingPath(props.path) ? "routing-edit" : "outbounds-edit",
        restartAfterWrite,
        afterWrite: async () => {
          if (!isOutboundsPath(props.path)) return;
          const qProfilesDir = shQuote(profilesDir);
          const qPath = shQuote(props.path);
          await runRemote(
            `set -e; PROFILES_DIR=${qProfilesDir}; TARGET=${qPath}; ` +
              `if [ -f "$PROFILES_DIR/.active" ]; then ` +
              `  ACTIVE=$(cat "$PROFILES_DIR/.active" 2>/dev/null || true); ` +
              `  case "$ACTIVE" in ""|"."|".."|*/*) ACTIVE="";; esac; ` +
              `  [ -n "$ACTIVE" ] && [ -d "$PROFILES_DIR/$ACTIVE" ] && ` +
              `  cp "$TARGET" "$PROFILES_DIR/$ACTIVE/04_outbounds.json" && ` +
              `  echo "Synced to profile $ACTIVE"; ` +
              `fi`,
          );
        },
      });

      await showToast({
        style: Toast.Style.Success,
        title: restartAfterWrite ? "Applied safely" : "Saved",
        message: backupPath ? "Backup created for rollback" : "Updated config",
      });
      setOriginalContent(rawContent);
      setContent(rawContent);
      props.onAfterSave?.({ restarted: restartAfterWrite });
    } catch (e: any) {
      await showToast({
        style: Toast.Style.Failure,
        title: restartAfterWrite ? "Safe apply failed" : "Save failed",
        message: e?.message ?? String(e),
      });
    }
  }

  const changedLines = countChangedLines(originalContent, content);
  const diffSummary = changedLines === 0 ? "(no changes)" : `${changedLines} line(s) changed`;

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save (No Restart)" onSubmit={(values) => void saveContent(values.content, false)} />
          <Action title="Safe Apply (Save + Restart)" onAction={() => void saveContent(content, true)} />
          <Action title="Reload" icon={Icon.RotateClockwise} onAction={load} />
          <Action title="Rollback Latest Backup" onAction={rollbackLatestBackup} />
          <Action.Push
            title="Show Diff (Before VS Current)"
            target={<Detail markdown={mdCode(`${props.title} Diff`, diffSummary)} />}
          />
          <Action.Push title="Preview (Read-Only)" target={<Detail markdown={mdCode(props.title, content)} />} />
          <Action.CopyToClipboard title="Copy" content={content} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="content" title={props.title} value={content} onChange={setContent} />
      <Form.Description text={`Remote path: ${props.path}`} />
    </Form>
  );
}
