import { Action, ActionPanel, Color, Detail, Icon, open, showToast, Toast, Keyboard } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { cloneElement, type ReactElement } from "react";
import { displayNameFor, toDetailMarkdown, toMarkdownBlock } from "../lib/language";
import { setFavorite } from "../lib/snipper-helper";
import type { Language, Snippet } from "../lib/types";
import { getPrefs, type SnippetActionValue } from "../lib/preferences";

function normalizeHubUrl(hubUrl: string): string {
  return hubUrl.startsWith("http") ? hubUrl : `https://${hubUrl}`;
}

interface SnippetUIProps {
  snippet: Snippet;
  languages?: Map<string, Language>;
  workspaceName?: string;
  /** Re-run the list query after a mutating action (e.g. favorite toggle). */
  onMutated?: () => void;
  /** Record that this snippet was used (frecency + "paste last"). */
  onUse?: () => void;
}

export function SnippetActions({
  snippet,
  languages,
  workspaceName,
  onMutated,
  onUse,
  inDetail,
}: SnippetUIProps & { inDetail?: boolean }) {
  const prefs = getPrefs();

  async function toggleFavorite() {
    try {
      await setFavorite(snippet.id, !snippet.isFavorite);
      await showToast({
        style: Toast.Style.Success,
        title: snippet.isFavorite ? "Removed from Favorites" : "Added to Favorites",
      });
      onMutated?.();
    } catch (error) {
      await showFailureToast(error, { title: "Couldn't update favorite" });
    }
  }

  const builders: Record<SnippetActionValue, ReactElement> = {
    paste: <Action.Paste title="Paste Snippet" content={snippet.content} icon={Icon.Clipboard} onPaste={onUse} />,
    copy: <Action.CopyToClipboard title="Copy Snippet" content={snippet.content} onCopy={onUse} />,
    copyMarkdown: (
      <Action.CopyToClipboard
        title="Copy as Markdown"
        content={toMarkdownBlock(snippet.content, snippet.language, languages)}
        shortcut={Keyboard.Shortcut.Common.Copy}
        onCopy={onUse}
      />
    ),
    // Requires the snipper://snippet/{id} route in SnipperApp; otherwise just focuses the app.
    open: (
      <Action
        title="Open in SnipperApp"
        icon={Icon.AppWindow}
        onAction={() => {
          onUse?.();
          open(`snipper://snippet/${snippet.id}`);
        }}
      />
    ),
    details: (
      <Action.Push
        title="Show Details"
        icon={Icon.Eye}
        target={
          <SnippetDetail
            snippet={snippet}
            languages={languages}
            workspaceName={workspaceName}
            onMutated={onMutated}
            onUse={onUse}
          />
        }
      />
    ),
  };

  const order: SnippetActionValue[] = [];
  const candidates: SnippetActionValue[] = [
    prefs.primaryAction,
    prefs.secondaryAction,
    "details",
    "paste",
    "copy",
    "copyMarkdown",
    "open",
  ];
  for (const value of candidates) {
    if (inDetail && value === "details") continue; // no nested detail push
    if (!order.includes(value)) order.push(value);
  }

  const hubUrl = snippet.hubUrl ? normalizeHubUrl(snippet.hubUrl) : null;

  return (
    <ActionPanel>
      <ActionPanel.Section>{order.map((value) => cloneElement(builders[value], { key: value }))}</ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title={snippet.isFavorite ? "Remove Favorite" : "Add to Favorites"}
          icon={snippet.isFavorite ? Icon.StarDisabled : Icon.Star}
          shortcut={{ modifiers: ["cmd"], key: "f" }}
          onAction={toggleFavorite}
        />
        {hubUrl && <Action.OpenInBrowser title="Open on Hub" url={hubUrl} shortcut={Keyboard.Shortcut.Common.Open} />}
        {hubUrl && (
          <Action.CopyToClipboard
            title="Copy Hub URL"
            content={hubUrl}
            shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
          />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}

export function SnippetDetail({ snippet, languages, workspaceName, onMutated, onUse }: SnippetUIProps) {
  const markdown = toDetailMarkdown(snippet.title, snippet.content, snippet.language, languages);
  const hubUrl = snippet.hubUrl ? normalizeHubUrl(snippet.hubUrl) : null;

  return (
    <Detail
      navigationTitle={snippet.title}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Language" text={displayNameFor(snippet.language, languages)} />
          {workspaceName && (
            <Detail.Metadata.Label title="Workspace" text={workspaceName} icon={Icon.AppWindowGrid2x2} />
          )}
          <Detail.Metadata.Label
            title="Favorite"
            icon={snippet.isFavorite ? { source: Icon.Star, tintColor: Color.Yellow } : Icon.StarDisabled}
            text={snippet.isFavorite ? "Yes" : "No"}
          />
          {hubUrl ? <Detail.Metadata.Link title="Hub" target={hubUrl} text="View on Hub" /> : null}
          {snippet.updatedAt && (
            <Detail.Metadata.Label title="Updated" text={new Date(snippet.updatedAt).toLocaleString()} />
          )}
        </Detail.Metadata>
      }
      actions={
        <SnippetActions
          snippet={snippet}
          languages={languages}
          workspaceName={workspaceName}
          onMutated={onMutated}
          onUse={onUse}
          inDetail
        />
      }
    />
  );
}
