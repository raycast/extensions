import { Action, ActionPanel, Clipboard, Detail, Icon, Keyboard, showToast, Toast, open } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { homedir } from "os";
import { join } from "path";
import { writeFileSync } from "fs";
import { ReactNode, useState } from "react";
import { Args } from "../lib/core";
import { collectLinks, findCsv, json } from "../lib/format";
import { structured } from "../lib/render";
import { PROFILE_KEYS } from "./RecordCard";
import { friendly, reportError, run } from "../lib/mcp";
import { TOOL_MAP } from "../lib/tools";
import { eyebrow } from "../lib/theme";
import { CompareResult } from "./CompareResult";
import { DomainResult } from "./DomainResult";
import { FooterActions } from "./Footer";
import { DetailMetadata, looksLikeProfile, profileFields, profileMarkdown, profileOf } from "./Profile";

interface Props {
  toolName: string;
  args?: Args;
  title?: string;
  extraActions?: ReactNode;
}

/** Runs a tool (with the confirmation handshake for account changes) and renders the result. */
function GenericResult({ toolName, args = {}, title, extraActions }: Props) {
  const def = TOOL_MAP[toolName];
  const { data, isLoading, error, revalidate } = usePromise(run, [toolName, args], { onError: reportError });
  const [raw, setRaw] = useState(false);

  const heading = title ?? def?.title ?? toolName;
  const prof = toolName === "get_listing" && data && !raw ? profileOf(data.data) : undefined;
  const asProfile = prof && looksLikeProfile(prof) ? prof : undefined;
  let markdown = `${eyebrow(def?.group === "account_write" ? "Account" : "Result")}\n\n# ${heading}\n\n`;
  if (error) {
    const f = friendly(error);
    markdown += `**${f.title}**\n\n${f.message}\n`;
  } else if (data) {
    if (data.summary) markdown += `${data.summary}\n\n`;
    const csv = findCsv(data.data);
    if (asProfile) markdown = profileMarkdown(asProfile, structured(asProfile, 2, PROFILE_KEYS));
    else if (raw) markdown += json(data.data);
    else if (csv && toolName === "export_watchlist_csv") markdown += "```csv\n" + csv + "\n```";
    else markdown += structured(data.data);
  } else if (isLoading) {
    markdown += "Working…";
  }

  const links = data ? collectLinks(data.data) : [];
  const errLink = error ? friendly(error).url : undefined;
  const csv = data ? findCsv(data.data) : undefined;

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={heading}
      markdown={markdown}
      metadata={asProfile ? <DetailMetadata fields={profileFields(asProfile)} /> : undefined}
      actions={
        <ActionPanel>
          {links.map((l, i) => (
            <Action.OpenInBrowser
              key={l.url}
              title={`Open ${l.label}`}
              url={l.url}
              icon={Icon.Link}
              shortcut={i === 0 ? undefined : undefined}
            />
          ))}
          {errLink && <Action title="Open Link" icon={Icon.Link} onAction={() => open(errLink)} />}
          {extraActions}
          <Action.CopyToClipboard
            title="Copy JSON"
            content={JSON.stringify(data?.data ?? null, null, 2)}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action
            title={raw ? "Show Readable View" : "Show Raw JSON"}
            icon={Icon.Code}
            onAction={() => setRaw((r) => !r)}
            shortcut={{ modifiers: ["cmd"], key: "j" }}
          />
          {csv && toolName === "export_watchlist_csv" && (
            <Action
              title="Save CSV to Downloads"
              icon={Icon.Download}
              onAction={async () => {
                const file = join(homedir(), "Downloads", `firmledger-watchlist-${Date.now()}.csv`);
                writeFileSync(file, csv);
                await showToast({ style: Toast.Style.Success, title: "Saved", message: file });
                await Clipboard.copy(file);
              }}
            />
          )}
          <Action title="Run Again" icon={Icon.ArrowClockwise} onAction={revalidate} shortcut={Keyboard.Shortcut.Common.Refresh} />
          <FooterActions />
        </ActionPanel>
      }
    />
  );
}

/** Picks a purpose-built screen for tools that have one, otherwise the generic layout. */
export function ToolResult(props: Props) {
  if (props.toolName === "check_domain") return <DomainResult args={props.args ?? {}} />;
  if (props.toolName === "compare_listings") return <CompareResult args={props.args ?? {}} />;
  return <GenericResult {...props} />;
}
