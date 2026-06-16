import { useState } from "react";
import { Action, ActionPanel, getPreferenceValues, Icon, LaunchProps, List } from "@raycast/api";
import { SummaryOpts, summarizeQuicklink, summarizeUrl } from "./kagi";

interface Prefs {
  summaryType: string;
  summaryLanguage: string;
}

const SUMMARIZER_PAGE = "https://kagi.com/summarizer/";

export default function Command(props: LaunchProps<{ arguments: { url?: string } }>) {
  const p = getPreferenceValues<Prefs>();
  const opts: SummaryOpts = { summary: p.summaryType, target_language: p.summaryLanguage };

  const [text, setText] = useState(props.arguments?.url || props.fallbackText || "");
  const url = text.trim();
  const valid = /^https?:\/\//i.test(url);
  const pageUrl = valid ? summarizeUrl(url, opts) : SUMMARIZER_PAGE;

  return (
    <List
      searchText={text}
      onSearchTextChange={setText}
      searchBarPlaceholder="URL to summarize (or ↩ to open the Summarizer)…"
    >
      <List.Item
        icon={Icon.Document}
        title={valid ? url : "Open Kagi Summarizer"}
        subtitle={
          valid
            ? p.summaryType
            : url
              ? "add http:// or https:// — or ↩ opens the Summarizer"
              : "paste a URL, or press ↩ to open the Summarizer"
        }
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title={valid ? "Open Summary in Kagi" : "Open Kagi Summarizer"}
              icon={Icon.Globe}
              url={pageUrl}
            />
            {valid && (
              <Action.CopyToClipboard title="Copy Summary URL" icon={Icon.Clipboard} content={pageUrl} />
            )}
            <Action.CreateQuicklink
              title="Bind as Quicklink (Alias / Hotkey)"
              icon={Icon.Link}
              shortcut={{ modifiers: ["cmd"], key: "b" }}
              quicklink={{ name: "Kagi Summarize", link: summarizeQuicklink(opts) }}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
